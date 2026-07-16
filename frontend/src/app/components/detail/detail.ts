import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Api } from '../../services/api';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-detail',
  imports: [
    CommonModule, 
    RouterModule, 
    MatCardModule, 
    MatExpansionModule, 
    MatIconModule, 
    MatButtonModule, 
    MatDividerModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './detail.html',
  styleUrl: './detail.scss',
})
export class Detail implements OnInit {
  protected readonly document = signal<any | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly activeRequirementId = signal<number | null>(null);

  constructor(
    private route: ActivatedRoute,
    private api: Api
  ) {}

  ngOnInit(): void {
    const docId = this.route.snapshot.paramMap.get('id');
    if (docId) {
      this.loadDocumentDetails(docId);
    } else {
      this.errorMessage.set('Geçersiz doküman referansı.');
      this.isLoading.set(false);
    }
  }

  loadDocumentDetails(id: string): void {
    this.api.getDocument(id).subscribe({
      next: (data) => {
        this.document.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set('Doküman detayları yüklenirken bir hata oluştu.');
        this.isLoading.set(false);
        console.error(err);
      }
    });
  }

  toggleRequirement(reqId: number): void {
    if (this.activeRequirementId() === reqId) {
      this.activeRequirementId.set(null);
    } else {
      this.activeRequirementId.set(reqId);
    }
  }
}
