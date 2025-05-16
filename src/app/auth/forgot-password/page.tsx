import Link from "next/link";
import { forgotPasswordAction } from "@/app/auth/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";

export default async function ForgotPassword(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;
  return (
    <main className="container mx-auto flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <Image
          src="https://tlvuxyxktqqzvynbhhtu.supabase.co/storage/v1/object/public/NukleoPublico/UsoPublicoGeneral/Logo.png"
          alt="KLV Ingeniería y Construcción"
          width={64}
          height={64}
          className="h-16 w-auto"
        />
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">
          Sistema de Rendiciones
        </h2>

        <form className="flex-1 flex flex-col w-full gap-2 text-foreground [&>input]:mb-6 min-w-64 max-w-64 mx-auto">
          <div>
            <h1 className="text-2xl font-medium">Restablecer contraseña</h1>
            <p className="text-sm text-secondary-foreground">
              Ya tienes una cuenta?{" "}
              <Link className="text-primary underline" href="/login">
                Iniciar sesion
              </Link>
            </p>
          </div>
          <div className="flex flex-col gap-2 [&>input]:mb-3 mt-8">
            <Label htmlFor="email">Email</Label>
            <Input name="email" placeholder="nombre@example.com" required />
            <SubmitButton formAction={forgotPasswordAction}>
              Restablecer contraseña
            </SubmitButton>
            <FormMessage message={searchParams} />
          </div>
        </form>
      </div>
    </main>
  );
}
