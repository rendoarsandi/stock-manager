import React from "react"
import { LoginForm } from "@/components/login-form"

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-200 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900">
      <div className="w-full max-w-[420px] transition-all duration-500 ease-out transform translate-y-0 opacity-100">
        <div className="mb-8 flex flex-col items-center justify-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 mb-4 shadow-md">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Stock Manager</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">Manage your inventory intelligently</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
