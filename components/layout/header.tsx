"use client"

import { ChevronDown } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { logout } from '@/app/actions/auth'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { EDITION_PACKAGES } from '@/lib/edition-packages'

interface HeaderProps {
  user: { email?: string; role: string }
}

export function Header({ user }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const selectedPackage = searchParams.get('package') || 'tutti'

  const handlePackageChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'tutti') {
      params.delete('package')
    } else {
      params.set('package', value)
    }
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-end gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Pacchetto edizioni</span>
        <Select value={selectedPackage} onValueChange={handlePackageChange}>
          <SelectTrigger className="w-[300px] h-9 text-sm">
            <SelectValue placeholder="Seleziona..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tutti">(Tutti)</SelectItem>
            {EDITION_PACKAGES.map((pkg) => (
              <SelectItem key={pkg.id} value={pkg.id}>
                {pkg.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 outline-none">
          <Avatar className="h-8 w-8 bg-[#1e3a5f]">
            <AvatarFallback className="bg-[#1e3a5f] text-white text-xs">
              {user?.email?.slice(0, 2).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="text-right">
            <p className="text-sm font-medium leading-none">
              {user?.email?.split('@')[0] || 'utente'}
            </p>
            <p className="text-xs text-gray-500">Arche</p>
          </div>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <form action={logout}>
              <button type="submit" className="w-full text-left cursor-pointer">
                Logout
              </button>
            </form>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
