export class LoginRequestDTO {
    constructor(
    //   public email: string,
      public password: string,
      public username: string
    ) {}
  }
  
export class SignUpRequestDTO {
  constructor(
    public email: string,
    public password: string,
    public username: string,
    public user_type: string
  ) {}
}

export class UserResponseDTO {
  id: number;
  email: string;

  constructor(id: number, name: string, email: string) {
    this.id = id;
    this.email = email;
  }
}
