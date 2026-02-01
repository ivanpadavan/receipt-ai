import { Resolver } from "react-hook-form";
import {
    Receipt,
    calculateTotal,
    calculateGrandTotal,
} from "@/model/receipt/model";

// ============================================================================
// Validation Types
// ============================================================================

export interface ReceiptValidationContext {
    type: "validation" | "editing" | "splitting";
}

// ============================================================================
// Individual Validators (pure functions)
// ============================================================================

export const validateStringNotEmpty = (value: string): string | null =>
    value.length === 0 ? "should not be empty" : null;

export const validateNumberMoreThanZero = (value: number): string | null =>
    value <= 0 || isNaN(value) ? "should not be equal or below zero" : null;

export const validateOverallMatchesQuantityPrice = (
    overall: number,
    quantity: number,
    price: number
): string | null => {
    const calculatedOverall = quantity * price;
    return Math.abs(calculatedOverall - overall) > 0.01
        ? `Overall value ${overall} doesn't match quantity * price (${quantity} * ${price} = ${calculatedOverall})`
        : null;
};

export const validateTotalMatchesSum = (
    total: number,
    positions: Receipt["positions"]
): string | null => {
    const calculatedTotal = calculateTotal(positions);
    return Math.abs(calculatedTotal - total) > 0.01
        ? `Total ${total} doesn't match the sum of all position overall values (${calculatedTotal})`
        : null;
};

export const validateGrandTotalMatchesCalculation = (
    grandTotal: number,
    receipt: Receipt
): string | null => {
    const calculatedGrandTotal = calculateGrandTotal(receipt);
    return Math.abs(calculatedGrandTotal - grandTotal) > 0.01
        ? `Final grand total ${grandTotal} doesn't match calculated (${calculatedGrandTotal})`
        : null;
};

// ============================================================================
// React Hook Form Resolver
// ============================================================================

interface FieldError { type: string; message: string }
 
// type ErrorRecord = Record<string, FieldError | ErrorRecord>;
type ErrorRecord = Record<string, any>;

export const createReceiptResolver = (
    context: ReceiptValidationContext
): Resolver<Receipt> => {
    return async (values) => {
        const errors: ErrorRecord = {};

        // Validate positions
        const positionErrors: ErrorRecord = {};

        values.positions.forEach((position, index) => {
            const posErr: ErrorRecord = {};

            // Name validation
            const nameError = validateStringNotEmpty(position.name);
            if (nameError) {
                posErr.name = { message: nameError, type: "stringEmpty" };
            }

            // Price validation
            const priceError = validateNumberMoreThanZero(position.price);
            if (priceError) {
                posErr.price = { message: priceError, type: "valueZero" };
            }

            // Quantity validation
            const quantityError = validateNumberMoreThanZero(position.quantity);
            if (quantityError) {
                posErr.quantity = { message: quantityError, type: "valueZero" };
            }

            // Overall matches quantity * price (only in validation mode)
            if (context.type === "validation") {
                const overallError = validateOverallMatchesQuantityPrice(
                    position.overall,
                    position.quantity,
                    position.price
                );
                if (overallError) {
                    posErr.overall = { message: overallError, type: "overallMismatch" };
                }
            }

            if (Object.keys(posErr).length > 0) {
                positionErrors[index] = posErr;
            }
        });

        if (Object.keys(positionErrors).length > 0) {
            errors.positions = positionErrors;
        }

        // Validate fees
        const feesErrors: ErrorRecord = {};
        values.fees.forEach((fee, index) => {
            const feeErr: ErrorRecord = {};

            const nameError = validateStringNotEmpty(fee.name);
            if (nameError) {
                feeErr.name = { message: nameError, type: "stringEmpty" };
            }

            const valueError = validateNumberMoreThanZero(fee.value);
            if (valueError) {
                feeErr.value = { message: valueError, type: "valueZero" };
            }

            if (Object.keys(feeErr).length > 0) {
                feesErrors[index] = feeErr;
            }
        });

        if (Object.keys(feesErrors).length > 0) {
            errors.fees = feesErrors;
        }

        // Validate discounts
        const discountsErrors: ErrorRecord = {};
        values.discounts.forEach((discount, index) => {
            const discErr: ErrorRecord = {};

            const nameError = validateStringNotEmpty(discount.name);
            if (nameError) {
                discErr.name = { message: nameError, type: "stringEmpty" };
            }

            const valueError = validateNumberMoreThanZero(discount.value);
            if (valueError) {
                discErr.value = { message: valueError, type: "valueZero" };
            }

            if (Object.keys(discErr).length > 0) {
                discountsErrors[index] = discErr;
            }
        });

        if (Object.keys(discountsErrors).length > 0) {
            errors.discounts = discountsErrors;
        }

        // Validate totals (only in validation mode)
        if (context.type === "validation") {
            const totalsErrors: ErrorRecord = {};

            const totalError = validateTotalMatchesSum(values.totals.total, values.positions);
            if (totalError) {
                totalsErrors.total = { message: totalError, type: "totalMismatch" };
            }

            const grandTotalError = validateGrandTotalMatchesCalculation(
                values.totals.grandTotal,
                values
            );
            if (grandTotalError) {
                totalsErrors.grandTotal = { message: grandTotalError, type: "grandTotalMismatch" };
            }

            if (Object.keys(totalsErrors).length > 0) {
                errors.totals = totalsErrors;
            }
        }

        return {
            values: Object.keys(errors).length === 0 ? values : {},
            errors: errors as never,
        };
    };
};
