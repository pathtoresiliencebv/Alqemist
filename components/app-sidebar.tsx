import * as React from "react"
import { LogOut, User } from "lucide-react"
import Image from "next/image"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { UserThreadList } from "@/components/user-thread-list"
import { useAppStore } from "@/lib/store"
import { useClerk } from "@clerk/nextjs"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAppStore();
  const { signOut } = useClerk();
  
  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/";
  };
  
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <div className="flex items-center justify-center">
                <Image
                  src="/alqemist-logo.png"
                  alt="Alqemist"
                  width={32}
                  height={32}
                  className="rounded-lg"
                />
                <div className="flex flex-col gap-0.5 leading-none ml-3">
                  <span className="font-semibold text-purple-700">Alqemist</span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <UserThreadList />
      </SidebarContent>
      
      <SidebarRail />
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" onClick={handleSignOut}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <User className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">Welkom, {user?.name || user?.email || 'Gast'}</span>
                <span className="text-xs flex items-center gap-1">
                  <LogOut className="size-3" />
                  Afmelden
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
