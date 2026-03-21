export const receiptImageInstructions =
  "Analyze the receipt images and extract the structured data.\n" +
  "Treat all provided images as parts of the same receipt.\n" +
  "Extract all paid items, prices, quantities, and totals.\n" +
  "Items can have titles with line breaks. Don't miss data due to line break in the receipt. Carefully analyze start and end of position title.\n" +
  "Skip free giveaway or complimentary positions with zero total cost. Do not include positions whose overall is 0 in the output.\n" +
  "If a drink line is priced by liters but represents a single served item, simplify it to pieces: use quantity 1, use the line total as the item price and overall, and keep the poured volume in the name when helpful.\n" +
  "After normalization, merge identical positions into one line when they have the same normalized name and unit price. Sum their quantity and overall.\n" +
  "Identify any modifiers that increase the total (like tips, VAT, service fees) and modifiers that decrease the total (like discounts, promotions).\n" +
  "Format the data according to the specified schema and keep totals consistent with the paid positions and modifiers.";
