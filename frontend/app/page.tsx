import LoginForm from "@/features/auth/LoginForm";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <LoginForm />
    </main>
  );
}