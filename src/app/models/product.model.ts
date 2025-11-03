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
    status: 'active' | 'completed' | 'inactive' | 'drawn';
    adminId: string;
    createdAt: any; 
     winnerId?: string;
     winningTicketId?: string;
     winnerName?: string;
  }