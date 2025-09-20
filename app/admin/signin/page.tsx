import { Suspense } from "react";
import { SigninClient } from "./signinClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-600">Yükleniyor…</div>}>
      <SigninClient />
    </Suspense>
  );
}
