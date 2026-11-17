"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Business type is collected on /register; keep this route as a redirect for old links. */
export default function RegisterBusinessRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/register/company");
  }, [router]);
  return <p className="p-8 text-center text-muted">Continuing to company profile…</p>;
}
