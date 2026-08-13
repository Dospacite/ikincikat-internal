export const postingDirection = {
  OWNER_RECEIVES: "İlan sahibi kredi alır",
  OWNER_PAYS: "İlan sahibi kredi verir",
} as const;
export const pricingUnit = {
  OVERALL: "toplam",
  HOURLY: "saat başına",
  DAILY: "gün başına",
} as const;
export const postingStatus = {
  PUBLISHED: "Yayında",
  CLOSED: "Kapalı",
  HIDDEN: "Gizli",
} as const;
export const applicationStatus = {
  PENDING: "Bekliyor",
  ACCEPTED: "Kabul edildi",
  DECLINED: "Reddedildi",
  WITHDRAWN: "Geri çekildi",
} as const;
export const exchangeStatus = {
  ACTIVE: "Sürüyor",
  SETTLED: "Tamamlandı",
  CANCELLED: "İptal edildi",
  REVERSED: "Geri alındı",
} as const;
export const announcementStatus = {
  DRAFT: "Taslak",
  PUBLISHED: "Yayında",
  ARCHIVED: "Arşivde",
} as const;

export const auditAction: Record<string, string> = {
  AUTH_SIGN_IN: "Oturum açma",
  AUTH_SIGN_OUT: "Oturum kapatma",
  AUTH_PASSWORD_CHANGED: "Parola değiştirme",
  POSTING_CREATED: "İlan oluşturma",
  POSTING_CLOSED: "İlan kapatma",
  POSTING_MODERATED: "İlan moderasyonu",
  POSTING_EDITED_BY_ADMIN: "İlan düzenleme",
  APPLICATION_CREATED: "Başvuru gönderme",
  APPLICATION_WITHDRAWN: "Başvuru geri çekme",
  APPLICATION_ACCEPTED: "Başvuru kabul etme",
  APPLICATION_DECLINED: "Başvuru reddetme",
  EXCHANGE_SETTLED: "Takas tamamlama",
  EXCHANGE_CANCELLED: "Takas iptali",
  CREDIT_ADJUSTED: "Kredi düzenleme",
  ANNOUNCEMENT_CREATED: "Duyuru oluşturma",
  ANNOUNCEMENT_UPDATED: "Duyuru düzenleme",
  PROFILE_UPDATED: "Profil düzenleme",
  PROFILE_PHOTO_UPDATED: "Profil fotoğrafı değiştirme",
  NOTIFICATION_READ: "Bildirim okuma",
  NOTIFICATIONS_ALL_READ: "Tüm bildirimleri okuma",
  USER_CREATED: "Üye oluşturma",
  USER_PASSWORD_RESET: "Üye parolası sıfırlama",
  USER_REACTIVATED: "Üyeyi etkinleştirme",
  USER_DEACTIVATED: "Üyeyi devre dışı bırakma",
  USER_IDENTITY_UPDATED: "Üye bilgilerini düzenleme",
  ROLE_CREATED: "Rol oluşturma",
  ROLE_UPDATED: "Rol düzenleme",
  ROLE_ASSIGNED: "Rol atama",
  ROLE_REMOVED: "Rol kaldırma",
};
