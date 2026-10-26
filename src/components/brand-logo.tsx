import Image from "next/image";

import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
};

export function BrandLogo({ className, priority = false }: BrandLogoProps) {
  return (
    <Image
      src="/logo.webp"
      alt="Logo da Groomer Carla"
      width={640}
      height={640}
      sizes="96px"
      priority={priority}
      className={cn("rounded-full object-cover", className)}
    />
  );
}
