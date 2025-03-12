export interface AGMSummary {
  nominees: Nominee[];
  proposals: Proposal[];
}
export interface Nominee {
    id: number;
  Nominee: string;
  For: number;
  Against: number;
  Abstained: number;
  Broker_non: number;
}

export interface Proposal {
  Proposal: string;
  For: number;
  Against: number;
  Abstained: number;
  Broker_non: number;
  Year_1: number;
  Year_2: number;
  Year_3: number;
}
