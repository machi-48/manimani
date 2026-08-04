// "use server" のファイルは async 関数しか export できないため、
// フォームの状態の型と初期値はここに置く。
export type FormState = { error: string | null; savedAt: number | null };

export const EMPTY_FORM_STATE: FormState = { error: null, savedAt: null };
