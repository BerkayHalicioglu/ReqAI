import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
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

  getDocuments(skip: number = 0, limit: number = 5): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/documents?skip=${skip}&limit=${limit}`);
  }

  getDocument(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/documents/${id}`);
  }

  updateRequirement(documentId: string, requirementId: string, payload: { title: string, description: string, priority: string }): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/documents/${documentId}/requirements/${requirementId}`, payload);
  }

  deleteDocument(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/documents/${id}`);
  }

  renameDocument(id: string, filename: string): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/documents/${id}`, { filename });
  }

  getAnalytics(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/documents/analytics`);
  }

  updateTestScenario(documentId: string, scenarioId: string, payload: { status?: string, comment?: string, evidence_file?: string }): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/documents/${documentId}/test-scenarios/${scenarioId}`, payload);
  }

  uploadEvidence(file: File): Observable<{ filename: string, original_filename: string, url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ filename: string, original_filename: string, url: string }>(`${this.baseUrl}/documents/upload-evidence`, formData);
  }

  getEvidenceUrl(filename: string): string {
    if (!filename) return '';
    if (filename.startsWith('http://') || filename.startsWith('https://')) return filename;
    return `${this.baseUrl}/documents/uploads/${filename}`;
  }
}


