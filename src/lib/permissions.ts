export const PERMISSION_CATALOG = {
  "posting.moderate": {
    name: "İlanları yönet",
    description:
      "Üyelerin ilanlarını gizleyebilir, geri açabilir, düzenleyebilir veya kapatabilir.",
  },
  "announcement.manage": {
    name: "Duyuruları yönet",
    description: "Duyuru hazırlayabilir, yayımlayabilir ve arşivleyebilir.",
  },
  "credit.adjust": {
    name: "Kredi düzenle",
    description:
      "Üyelerin kredi bakiyesini gerekçe yazarak artırabilir veya azaltabilir.",
  },
  "credit.view_all": {
    name: "Tüm kredi hareketlerini gör",
    description: "Üyeler arası kredi hareketlerinin tamamını görüntüleyebilir.",
  },
} as const;

export type PermissionCode = keyof typeof PERMISSION_CATALOG;

export const USER_ROLE_PERMISSIONS = [
  "directory.read",
  "profile.self.update",
  "posting.create",
  "posting.self.manage",
  "application.create",
  "application.self.manage",
  "exchange.participate",
  "announcement.read",
  "credit.own.read",
  "credit.mint_log.read",
] as const;
