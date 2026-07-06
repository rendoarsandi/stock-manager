import React from "react"
import { LoginForm } from "./login-form"
import loginCover from "../assets/login-cover.png"

export default function Page() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      <div className="flex flex-col gap-4 p-6 md:p-10 justify-between">
        <div className="flex justify-center gap-2 md:justify-start">
          <div className="flex items-center gap-2.5 font-semibold text-lg">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-md">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <span className="tracking-tight font-bold text-zinc-900 dark:text-zinc-100">Stock Manager</span>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[340px]">
            <LoginForm />
          </div>
        </div>
        <div className="text-center md:text-left text-xs text-zinc-400 dark:text-zinc-500">
          &copy; {new Date().getFullYear()} Stock Manager. All rights reserved.
        </div>
      </div>
      <div className="relative hidden lg:block bg-zinc-950 overflow-hidden">
        <img
          src={loginCover}
          alt="Intelligent Inventory Cover"
          className="absolute inset-0 h-full w-full object-cover opacity-80 transition-transform duration-1000 hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-zinc-950/30" />
        <div className="absolute bottom-12 left-12 right-12 z-10 p-8 rounded-2xl border border-zinc-800/40 bg-zinc-950/40 backdrop-blur-md">
          <blockquote className="space-y-3">
            <p className="text-lg font-medium text-zinc-100 leading-relaxed">
              "This platform has transformed how we manage our inventory. Tracking stock levels, receiving imports, and managing order cycles is now completely seamless."
            </p>
            <footer className="text-sm font-semibold text-zinc-400">
              Intel Logistics Team
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  )
}
