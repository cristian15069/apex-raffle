import { Injectable, inject } from '@angular/core';
import { Storage, ref, uploadBytesResumable, getDownloadURL } from '@angular/fire/storage';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private storage: Storage = inject(Storage);

  /**
   * Sube un archivo a Firebase Storage y devuelve la URL de descarga.
   * @param file - El archivo a subir.
   * @param path - La ruta en Storage donde se guardará el archivo (ej. 'products/').
   * @returns Una promesa que se resuelve con la URL de descarga del archivo.
   */
  async uploadFile(file: File, path: string): Promise<string> {
    const storageRef = ref(this.storage, `${path}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    // Esperamos a que la subida se complete
    await uploadTask;

    // Obtenemos la URL de descarga
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  }
}