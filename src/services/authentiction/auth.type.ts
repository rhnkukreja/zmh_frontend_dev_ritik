export class LoginRequestDTO {
  constructor(
    //   public email: string,
    public password: string,
    public email: string
  ) { }
}

export class SignUpRequestDTO {
  constructor(
    public first_name: string,
    public last_name: string,
    public email: string,
    public password: string,
    public username: string,
    public user_type: string,
    public confirm_password: string,
    public phone?: string,
    public company?: number | null
  ) { }
}
export class VerifySignUpOtpDTO {
  constructor(
    public email: string,
    public otp: string

  ) { }
}
export class SendOtpDTO {
  constructor(

    public password: string,
    public email: string,
    public confirm_password: string

  ) { }
}
export class VerifyOtpDTO {
  constructor(
    public email: string,
    public otp: string

  ) { }
}

export class ResendSignUpOtpDTO {
  constructor(
    public email: string
  ) { }
}
