import { LoginForm } from "./login-form";

export const metadata = { title: "ログイン | manimani" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-10">
      <h1 className="text-xl font-bold tracking-tight">manimani</h1>
      <p className="mt-2 mb-6 text-sm text-black/50 dark:text-white/50">
        続けるにはパスワードを入力してください。
      </p>
      <LoginForm />
    </main>
  );
}
