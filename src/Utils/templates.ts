export const emailVerifyTemplate = (link: string, fullName: string) => `
  <div style="font-family:Arial,sans-serif;">
    <h2>Verify your email</h2>
    <p>Hi ${fullName},</p>
    <p>Thanks for registering. Please verify your email by clicking the button below:</p>
    <p><a href="${link}" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">Verify Email</a></p>
    <p>This link expires in 24 hours.</p>
  </div>
`;

export const emailOtpTemplate = (code: string, fullName: string) => `
  <div style="font-family:Arial,sans-serif;">
    <h2>Your login code</h2>
    <p>Hi ${fullName},</p>
    <p>Your one-time code is:</p>
    <div style="font-size:28px;font-weight:700;letter-spacing:4px;">${code}</div>
    <p>This code expires in 5 minutes.</p>
  </div>
`;
