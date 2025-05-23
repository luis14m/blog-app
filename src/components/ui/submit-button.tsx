'use client'

import { Button } from "@/components/ui/button";
import { type ComponentProps } from "react";

type Props = ComponentProps<typeof Button> & {
  pendingText?: string;
};

export function SubmitButton({
  children,
  pendingText = "Enviando...",
  isPending = false,
  ...props
}: Props & { isPending?: boolean }) {
  return (
    <Button type="submit" aria-disabled={isPending} {...props}>
      {isPending ? pendingText : children}
    </Button>
  );
}
