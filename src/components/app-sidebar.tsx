import {
  Bell,
  BookOpenText,
  CircleGauge,
  Handshake,
  Megaphone,
  PlusCircle,
  ScrollText,
  ShieldCheck,
  Tags,
  Users,
  WalletCards,
} from "lucide-react";
import Link from "next/link";

import { signOutAction } from "@/actions/auth";
import { MemberAvatar } from "@/components/member-avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const memberLinks = [
  ["Ana sayfa", "/", CircleGauge],
  ["İlanlar", "/ilanlar", BookOpenText],
  ["İlan ver", "/ilanlar/yeni", PlusCircle],
  ["İlanlarım", "/ilanlarim", Tags],
  ["Takaslar", "/takaslar", Handshake],
  ["Krediler", "/krediler", WalletCards],
  ["Duyurular", "/duyurular", Megaphone],
  ["Üyeler", "/uyeler", Users],
  ["Bildirimler", "/bildirimler", Bell],
] as const;
const privilegedLinks = [
  ["Duyuru yönetimi", "/yonetim/duyurular", Megaphone, "announcement.manage"],
  ["Kredi yönetimi", "/yonetim/krediler", WalletCards, "credit.adjust"],
  ["Moderasyon", "/yonetim/moderasyon", Tags, "posting.moderate"],
] as const;
const adminLinks = [
  ["Kullanıcılar", "/yonetim/kullanicilar", Users],
  ["Roller", "/yonetim/roller", ShieldCheck],
  ["Moderasyon günlüğü", "/yonetim/gunluk", ScrollText],
] as const;

export function AppSidebar({
  user,
  isAdmin,
  permissions,
}: {
  user: { name: string; username: string; image: string | null };
  isAdmin: boolean;
  permissions: string[];
}) {
  const managementLinks = privilegedLinks.filter(
    (link) =>
      isAdmin ||
      permissions.includes(link[3]) ||
      (link[1] === "/yonetim/krediler" &&
        permissions.includes("credit.view_all")),
  );
  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="border-b p-4">
        <Link href="/" className="block">
          <span className="font-sans text-lg">ikinciKat</span>
          <span className="ml-1 text-sm text-muted-foreground">Internal</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {memberLinks.map(([label, href, Icon]) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    className="min-h-11"
                    asChild
                    tooltip={label}
                  >
                    <Link href={href}>
                      <Icon />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {(isAdmin || managementLinks.length > 0) && (
          <SidebarGroup>
            <SidebarGroupLabel>Yönetim</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {managementLinks.map(([label, href, Icon]) => (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      className="min-h-11"
                      asChild
                      tooltip={label}
                    >
                      <Link href={href}>
                        <Icon />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                {isAdmin &&
                  adminLinks.map(([label, href, Icon]) => (
                    <SidebarMenuItem key={href}>
                      <SidebarMenuButton
                        className="min-h-11"
                        asChild
                        tooltip={label}
                      >
                        <Link href={href}>
                          <Icon />
                          <span>{label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t p-3">
        <div className="flex items-center gap-2">
          <Link
            href="/profil"
            className="flex min-w-0 flex-1 items-center gap-3 rounded-md p-1 hover:bg-sidebar-accent"
          >
            <MemberAvatar user={user} className="size-9" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">
                {user.name}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                @{user.username}
              </span>
            </span>
          </Link>
          <ThemeToggle />
        </div>
        <form action={signOutAction}>
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start"
          >
            Oturumu kapat
          </Button>
        </form>
      </SidebarFooter>
    </Sidebar>
  );
}
