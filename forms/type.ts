import { FormArray } from "./form_array";
import { FormControl } from "./form_control";
import { FormGroup } from "./form_group";

export type InferForm<T> = T extends Record<string, unknown> ? FormGroup<{[K in keyof T]: InferForm<T[K]>}>
                         : T extends Array<infer Arr> ? FormArray<InferForm<Arr>>
                          : FormControl<T>;
