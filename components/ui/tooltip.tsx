"use client"
export function TooltipProvider({ children }: any) { return children }
export function Tooltip({ children }: any) { return children }
export function TooltipTrigger({ children }: any) { return <span>{children}</span> }
export function TooltipContent({ children }: any) { return <div className="p-2 rounded border bg-white text-sm shadow">{children}</div> }
