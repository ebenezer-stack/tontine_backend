import { prisma } from '../index';

export class OtpService {
  private expirationTime = 600; // 10 minutes

  public async sendOtp(phone: string): Promise<{ success: boolean; message: string; expires_in?: number }> {
    const normalizedPhone = this.normalizePhone(phone);
    const code = this.generateCode();

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + this.expirationTime);

    await prisma.otps.create({
      data: {
        phone: normalizedPhone,
        code,
        expires_at: expiresAt,
      },
    });

    this.sendViaSms(normalizedPhone, code);

    return {
      success: true,
      message: 'Code OTP envoyé avec succès.',
      expires_in: this.expirationTime,
    };
  }

  public async verifyOtp(phone: string, code: string): Promise<{ success: boolean; message: string; otp_id?: bigint }> {
    const normalizedPhone = this.normalizePhone(phone);

    console.log(`Verifying OTP for phone: ${normalizedPhone}, code: ${code}`);

    const otp = await prisma.otps.findFirst({
      where: {
        phone: normalizedPhone,
        code: code,
      },
      orderBy: { id: 'desc' },
    });

    if (!otp) {
      console.warn(`OTP not found in DB for phone: ${normalizedPhone}, code: ${code}`);
      return {
        success: false,
        message: 'Code OTP invalide. Vérifiez et réessayez.',
      };
    }

    console.log(`OTP MATCHED for phone: ${normalizedPhone}`);

    // Mark as verified
    await prisma.otps.update({
      where: { id: otp.id },
      data: { verified_at: new Date() },
    });

    // Link to user if exists
    const user = await prisma.users.findUnique({
      where: { phone: normalizedPhone },
    });

    if (user && !otp.user_id) {
      await prisma.otps.update({
        where: { id: otp.id },
        data: { user_id: user.id },
      });
    }

    return {
      success: true,
      message: 'Code OTP vérifié avec succès.',
      otp_id: otp.id,
    };
  }

  private generateCode(): string {
    return '123456'; // Forced for development
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/[^0-9]/g, '');
  }

  private sendViaSms(phone: string, code: string): void {
    console.log(`SMS would be sent to ${phone}: Your TontineApp verification code is: ${code}`);
  }
}
