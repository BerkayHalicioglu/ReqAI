import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Api } from '../../services/api';
import { TranslationService } from '../../services/translation.service';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule, 
    RouterModule, 
    MatCardModule, 
    MatIconModule, 
    MatButtonModule, 
    MatProgressBarModule, 
    MatProgressSpinnerModule,
    MatMenuModule,
    MatTooltipModule
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
  protected readonly editingDocId = signal<string | null>(null);
  protected readonly activeManageId = signal<string | null>(null);
  protected readonly deleteConfirmId = signal<string | null>(null);

  // Global stats signals from paginated backend response
  protected readonly totalDocsCount = signal(0);
  protected readonly globalRequirementsCount = signal(0);
  protected readonly globalCriticalRequirementsCount = signal(0);
  protected readonly globalTasksCount = signal(0);

  // Computed signals for KPI Cards
  protected readonly totalDocuments = computed(() => this.totalDocsCount());
  protected readonly totalRequirements = computed(() => this.globalRequirementsCount());
  protected readonly criticalRequirements = computed(() => this.globalCriticalRequirementsCount());
  protected readonly totalTasks = computed(() => this.globalTasksCount());

  // Pagination Properties
  protected readonly currentPage = signal(1);
  protected readonly pageSize = signal(5);

  protected readonly totalPages = computed(() => {
    return Math.ceil(this.totalDocsCount() / this.pageSize());
  });

  protected readonly paginatedDocuments = computed(() => {
    return this.documents();
  });

  protected readonly pagesArray = computed(() => {
    const pages = this.totalPages();
    return Array.from({ length: pages }, (_, i) => i + 1);
  });

  constructor(
    private api: Api,
    private router: Router,
    public ts: TranslationService
  ) {}

  ngOnInit(): void {
    this.loadDocuments();
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadDocuments();
    }
  }

  loadDocuments(resetPage: boolean = false): void {
    if (resetPage) {
      this.currentPage.set(1);
    }
    const skip = (this.currentPage() - 1) * this.pageSize();
    const limit = this.pageSize();

    this.api.getDocuments(skip, limit).subscribe({
      next: (res) => {
        if (res.items.length === 0 && this.currentPage() > 1) {
          this.currentPage.set(this.currentPage() - 1);
          this.loadDocuments();
          return;
        }
        this.documents.set(res.items);
        this.totalDocsCount.set(res.total);
        this.globalRequirementsCount.set(res.total_requirements);
        this.globalCriticalRequirementsCount.set(res.total_critical_requirements);
        this.globalTasksCount.set(res.total_tasks);
      },
      error: (err) => {
        this.errorMessage.set(this.ts.t('dashboard.loadError'));
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
    const nameLower = file.name.toLowerCase();
    if (!nameLower.endsWith('.txt') && !nameLower.endsWith('.pdf') && !nameLower.endsWith('.docx')) {
      this.errorMessage.set(this.ts.t('dashboard.invalidFile'));
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
        this.errorMessage.set(this.ts.t('dashboard.uploadError'));
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
        this.errorMessage.set(this.ts.t('dashboard.analyzeError'));
        console.error(err);
        this.router.navigate(['/document', docId]);
      }
    });
  }

  deleteDocument(docId: string): void {
    this.deleteConfirmId.set(docId);
  }

  cancelDelete(): void {
    this.deleteConfirmId.set(null);
  }

  confirmDelete(): void {
    const docId = this.deleteConfirmId();
    if (!docId) return;

    this.api.deleteDocument(docId).subscribe({
      next: () => {
        this.deleteConfirmId.set(null);
        this.loadDocuments();
      },
      error: (err) => {
        this.deleteConfirmId.set(null);
        this.errorMessage.set(this.ts.t('dashboard.deleteError'));
        console.error(err);
      }
    });
  }

  toggleManage(id: string | null): void {
    this.activeManageId.set(this.activeManageId() === id ? null : id);
  }

  startRename(docId: string): void {
    this.editingDocId.set(docId);
  }

  cancelRename(): void {
    this.editingDocId.set(null);
  }

  saveRename(docId: string, newName: string): void {
    if (!newName || !newName.trim()) {
      this.cancelRename();
      return;
    }
    this.api.renameDocument(docId, newName.trim()).subscribe({
      next: () => {
        this.cancelRename();
        this.loadDocuments();
      },
      error: (err) => {
        this.errorMessage.set(this.ts.t('dashboard.renameError'));
        console.error(err);
      }
    });
  }
}
