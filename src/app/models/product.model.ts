export interface Product {
    id: string;
    name: string;
    description: string;
    imageUrl: string | null;
    baseCost: number;
    totalGoal: number;
    ticketPrice: number;
    totalTickets: number;
    ticketsSold: number;
    status: 'active' | 'completed';
    adminId: string;
    createdAt: any; 
  }