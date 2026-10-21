import Image from "next/image";

import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
};

export function BrandLogo({ className, priority = false }: BrandLogoProps) {
  return (
    <Image
      src="/logo.svg"
      alt="Logo da Teste"
      width={100}
      height={100}
      priority={priority}
      unoptimized
      className={cn("rounded-full object-cover", className)}
    />
  );
}
