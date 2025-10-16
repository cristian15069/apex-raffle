import { Component, OnInit, inject, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

@Component({
  selector: 'app-sales-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './sales-chart.html',
})
export class SalesChartComponent implements OnInit {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  private functions: Functions = inject(Functions);
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  
  isLoading = true;
  
  public barChartLegend = true;
  public barChartPlugins = [];
  public barChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [ { data: [], label: 'Ingresos (MXN)' } ]
  };
  public barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    scales: { y: { beginAtZero: true } }
  };

  ngOnInit(): void {
    this.loadSalesData('day');
  }

  async loadSalesData(period: 'day' | 'week' | 'month') {
    this.isLoading = true;
    
    try {
      const getSalesDataFn = httpsCallable(this.functions, 'getSalesData');
      const result = await getSalesDataFn({ period }) as any;
      setTimeout(() => {
        this.barChartData = {
          labels: result.data.labels,
          datasets: [
            {
              data: result.data.data,
              label: `Ingresos por ${this.getLabelForPeriod(period)} (MXN)`,
              backgroundColor: 'rgba(75, 192, 192, 0.6)',
              borderColor: 'rgba(75, 192, 192, 1)',
            }
          ]
        };
        
        this.cdr.detectChanges();
      }, 0);

    } catch (error) {
      console.error('Error al cargar datos para la gráfica:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private getLabelForPeriod(period: string): string {
    if (period === 'week') return 'Semana';
    if (period === 'month') return 'Mes';
    return 'Día';
  }
}