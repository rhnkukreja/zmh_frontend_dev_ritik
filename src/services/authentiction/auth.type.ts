export class LoginRequestDTO {
  constructor(
    //   public email: string,
    public password: string,
    public email: string
  ) {}
}

export class SignUpRequestDTO {
  constructor(
    public first_name: string,
    public last_name: string,
    public phone: string,
    public email: string,
    public password: string,
    // public username: string,
    public user_type: string
  ) {}
}
