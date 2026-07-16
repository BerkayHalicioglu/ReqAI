import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Api } from '../../services/api';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule, 
    RouterModule, 
    MatCardModule, 
    MatIconModule, 
    MatButtonModule, 
    MatProgressBarModule, 
    MatProgressSpinnerModule
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  protected readonly documents = signal<any[]>([]);
  protected readonly isUploading = signal(false);
  protected readonly isAnalyzing = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isDragOver = signal(false);

  // Computed signals for KPI Cards
  protected readonly totalDocuments = computed(() => this.documents().length);
  protected readonly totalRequirements = computed(() => {
    return this.documents().reduce((acc, doc) => acc + (doc.requirements?.length || 0), 0);
  });
  protected readonly criticalRequirements = computed(() => {
    return this.documents().reduce((acc, doc) => {
      const criticalCount = doc.requirements?.filter((r: any) => r.priority === 'CRITICAL' || r.priority === 'HIGH').length || 0;
      return acc + criticalCount;
    }, 0);
  });
  protected readonly totalTasks = computed(() => {
    return this.documents().reduce((acc, doc) => {
      const tasksCount = doc.requirements?.reduce((tAcc: number, r: any) => tAcc + (r.tasks?.length || 0), 0) || 0;
      return acc + tasksCount;
    }, 0);
  });

  // Pagination Properties
  protected readonly currentPage = signal(1);
  protected readonly pageSize = signal(5);

  protected readonly totalPages = computed(() => {
    const docsCount = this.documents().length;
    return Math.ceil(docsCount / this.pageSize());
  });

  protected readonly paginatedDocuments = computed(() => {
    const startIndex = (this.currentPage() - 1) * this.pageSize();
    const endIndex = startIndex + this.pageSize();
    return this.documents().slice(startIndex, endIndex);
  });

  protected readonly pagesArray = computed(() => {
    const pages = this.totalPages();
    return Array.from({ length: pages }, (_, i) => i + 1);
  });

  constructor(
    private api: Api,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDocuments();
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  loadDocuments(): void {
    this.api.getDocuments().subscribe({
      next: (data) => {
        this.documents.set(data);
        this.currentPage.set(1); // Reset to page 1 on fresh load
      },
      error: (err) => {
        this.errorMessage.set('Doküman listesi yüklenirken bir hata oluştu.');
        console.error(err);
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.uploadFile(input.files[0]);
    }
  }

  onFileDropped(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.uploadFile(event.dataTransfer.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
  }

  uploadFile(file: File): void {
    if (!file.name.endsWith('.txt')) {
      this.errorMessage.set('Lütfen sadece .txt formatında bir dosya yükleyin.');
      return;
    }

    this.errorMessage.set(null);
    this.isUploading.set(true);

    this.api.uploadDocument(file).subscribe({
      next: (newDoc) => {
        this.isUploading.set(false);
        this.loadDocuments();
        this.startAnalysis(newDoc.id);
      },
      error: (err) => {
        this.isUploading.set(false);
        this.errorMessage.set('Dosya yüklenirken sunucu hatası oluştu.');
        console.error(err);
      }
    });
  }

  startAnalysis(docId: string): void {
    this.isAnalyzing.set(true);
    this.api.analyzeDocument(docId).subscribe({
      next: () => {
        this.isAnalyzing.set(false);
        this.router.navigate(['/document', docId]);
      },
      error: (err) => {
        this.isAnalyzing.set(false);
        this.errorMessage.set('AI analizi sırasında bir hata oluştu (Fallback devrede olabilir). Detay sayfasından kontrol edebilirsiniz.');
        console.error(err);
        this.router.navigate(['/document', docId]);
      }
    });
  }
}
