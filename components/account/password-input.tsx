"use client";

import { useState } from "react";
import { RiEyeLine, RiEyeOffLine } from "react-icons/ri";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function PasswordInput({ className, inputClassName, ...props }: React.ComponentProps<typeof Input> & { inputClassName?: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={cn("relative", className)}>
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={cn("pl-11", inputClassName)}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "مخفی کردن رمز عبور" : "نمایش رمز عبور"}
        aria-pressed={visible}
        className="absolute left-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {visible ? <RiEyeOffLine className="size-4.5" /> : <RiEyeLine className="size-4.5" />}
      </button>
    </div>
  );
}
