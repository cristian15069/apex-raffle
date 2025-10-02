import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../services/product';
import { StorageService } from '../../services/storage';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-dashboard.html',
})
export class AdminDashboardComponent {
  productForm: FormGroup;
  isLoading = false;
  successMessage = '';
  errorMessage = '';
  selectedFile: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;

  private fb = inject(FormBuilder);
  private productService = inject(ProductService);
  private storageService = inject(StorageService);

  constructor() {
    this.productForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(5)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      baseCost: [0, [Validators.required, Validators.min(1)]]
    });
  }

  get name() { return this.productForm.get('name'); }
  get description() { return this.productForm.get('description'); }
  get baseCost() { return this.productForm.get('baseCost'); }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      const reader = new FileReader();
      reader.onload = () => this.imagePreview = reader.result;
      reader.readAsDataURL(this.selectedFile);
    }
  }

  async onSubmit(): Promise<void> {
    this.productForm.markAllAsTouched();
    if (this.productForm.invalid || !this.selectedFile) {
      this.errorMessage = 'Por favor, completa todos los campos y selecciona una imagen.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const imageUrl = await this.storageService.uploadFile(this.selectedFile, 'products');
      const productData = { ...this.productForm.value, imageUrl };
      await this.productService.createProduct(productData);
      
      this.successMessage = '¡Rifa creada exitosamente!';
      this.productForm.reset();
      this.selectedFile = null;
      this.imagePreview = null;
    } catch (error: any) {
      this.errorMessage = error.message || 'Ocurrió un error al crear la rifa.';
    } finally {
      this.isLoading = false;
    }
  }
}