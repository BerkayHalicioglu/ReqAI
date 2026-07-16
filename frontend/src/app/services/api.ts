import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';

@Service()
export class Api {
  private baseUrl = 'http://localhost:8000/api';
  private http = inject(HttpClient);

  uploadDocument(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.baseUrl}/documents/upload`, formData);
  }

  analyzeDocument(id: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/documents/${id}/analyze`, {});
  }

  getDocuments(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/documents`);
  }

  getDocument(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/documents/${id}`);
  }
}
