
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { FormsModule } from '@angular/forms';
import { map } from 'rxjs/operators';
import { Observable, from } from 'rxjs';

interface EarningsResponse {
  totalEarnings: number;
}

interface EarningsRequestData {
  period?: 'day' | 'week' | 'month';
  startDate?: string;
  endDate?: string;
}

@Component({
  selector: 'app-sales-chart',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, FormsModule],
  templateUrl: './sales-chart.html',
})
export class SalesChartComponent implements OnInit {
  private functions: Functions = inject(Functions);

  selectedDate: string = this.getTodayISOString();
  selectedWeekRange = {
    start: this.getWeekStartISOString(),
    end: this.getWeekEndISOString()
  };
  selectedMonth: string = this.getCurrentMonthISOString();

  dailyEarnings: number | null = null;
  weeklyEarnings: number | null = null;
  monthlyEarnings: number | null = null;
  isLoading = { day: false, week: false, month: false };

  ngOnInit(): void {
    this.loadDailyEarnings();
    this.loadWeeklyEarnings();
    this.loadMonthlyEarnings();
  }

  async loadDailyEarnings() {
    this.isLoading.day = true;
    this.dailyEarnings = null;
    try {
      const result = await this.fetchEarnings({ startDate: this.selectedDate, endDate: this.selectedDate });
      this.dailyEarnings = result.totalEarnings;
    } catch (error) {
      console.error("Error al cargar ganancias diarias:", error);
    } finally {
      this.isLoading.day = false;
    }
  }

  async loadWeeklyEarnings() {
    this.isLoading.week = true;
    this.weeklyEarnings = null;
    try {
      if (!this.selectedWeekRange.start || !this.selectedWeekRange.end) {
        throw new Error("Fechas de inicio y fin de semana requeridas.");
      }
      const result = await this.fetchEarnings({ startDate: this.selectedWeekRange.start, endDate: this.selectedWeekRange.end });
      this.weeklyEarnings = result.totalEarnings;
    } catch (error) {
      console.error("Error al cargar ganancias semanales:", error);
    } finally {
      this.isLoading.week = false;
    }
  }

  async loadMonthlyEarnings() {
    this.isLoading.month = true;
    this.monthlyEarnings = null;
    try {
      const { start, end } = this.getMonthDates(this.selectedMonth);
      const result = await this.fetchEarnings({ startDate: start, endDate: end });
      this.monthlyEarnings = result.totalEarnings;
    } catch (error) {
      console.error("Error al cargar ganancias mensuales:", error);
    } finally {
      this.isLoading.month = false;
    }
  }

  private async fetchEarnings(requestData: EarningsRequestData): Promise<EarningsResponse> {
    const getSalesDataFn = httpsCallable<EarningsRequestData, EarningsResponse>(this.functions, 'getSalesData');
    try {
      const result = await getSalesDataFn(requestData);
      return result.data;
    } catch (error) {
       console.error('fetchEarnings failed:', error);
       throw error;
    }
  }

  private getTodayISOString(): string { return new Date().toISOString().split('T')[0]; }
  private getWeekStartISOString(): string {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(today.setDate(diff)).toISOString().split('T')[0];
   }
  private getWeekEndISOString(): string {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? 0 : 7); // Adjust to get Sunday
    return new Date(today.setDate(diff)).toISOString().split('T')[0];
   }
  private getCurrentMonthISOString(): string {
     const today = new Date();
     return `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
   }
  private getMonthDates(monthStr: string): { start: string, end: string } {
    const [year, month] = monthStr.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    };
  }
}