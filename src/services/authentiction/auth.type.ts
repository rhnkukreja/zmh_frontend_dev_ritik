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
    public phone: string,
    public email: string,
    public password: string,
    public username: string,
    public user_type: string,
    public company: number | null,
    public confirm_password: string
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
