interface StaffContactInput {
  email?: string;
  phone?: string;
}

export interface StaffContactLinks {
  emailHref: string | null;
  phoneHref: string | null;
}

export function getStaffContactLinks({ email, phone }: StaffContactInput): StaffContactLinks {
  const normalizedEmail = email?.trim();
  const normalizedPhone = phone?.trim();

  return {
    emailHref: normalizedEmail ? `mailto:${normalizedEmail}` : null,
    phoneHref: normalizedPhone ? `tel:${normalizedPhone}` : null,
  };
}
