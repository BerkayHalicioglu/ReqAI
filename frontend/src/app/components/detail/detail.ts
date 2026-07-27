import { Component, signal, OnInit, OnDestroy, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Api } from '../../services/api';
import { TranslationService } from '../../services/translation.service';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';

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
    MatProgressSpinnerModule,
    MatMenuModule
  ],
  templateUrl: './detail.html',
  styleUrl: './detail.scss',
})
export class Detail implements OnInit, OnDestroy {
  protected readonly document = signal<any | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly activeRequirementId = signal<any | null>(null);
  protected readonly editingRequirementId = signal<string | null>(null);
  protected readonly showDownloadOptions = signal(false);
  protected readonly testStatuses = signal<Record<string, { status: 'PENDING' | 'PASSED' | 'FAILED', comment?: string, evidenceFile?: string }>>({});
  protected readonly selectedTestFilter = signal<'ALL' | 'PASSED' | 'FAILED'>('ALL');
  
  protected readonly selectedPriorityFilter = signal<string>('ALL');

  protected readonly editTitle = signal('');
  protected readonly editDescription = signal('');
  protected readonly editPriority = signal('');

  private pollTimer: any = null;

  ngOnDestroy(): void {
    this.stopPolling();
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }


  protected readonly totalTestScenariosCount = computed(() => {
    const doc = this.document();
    if (!doc || !doc.requirements) return 0;
    let count = 0;
    doc.requirements.forEach((req: any) => {
      if (req.tasks) {
        req.tasks.forEach((tsk: any) => {
          if (tsk.test_scenarios) {
            count += tsk.test_scenarios.length;
          }
        });
      }
    });
    return count;
  });

  protected readonly passedTestScenariosCount = computed(() => {
    const doc = this.document();
    if (!doc || !doc.requirements) return 0;
    const statuses = this.testStatuses();
    let count = 0;
    doc.requirements.forEach((req: any) => {
      if (req.tasks) {
        req.tasks.forEach((tsk: any) => {
          if (tsk.test_scenarios) {
            tsk.test_scenarios.forEach((scen: any) => {
              const state = statuses[scen.id];
              if (state) {
                if (typeof state === 'string' && state === 'PASSED') {
                  count++;
                } else if (state.status === 'PASSED') {
                  count++;
                }
              }
            });
          }
        });
      }
    });
    return count;
  });

  protected readonly failedTestScenariosCount = computed(() => {
    const doc = this.document();
    if (!doc || !doc.requirements) return 0;
    const statuses = this.testStatuses();
    let count = 0;
    doc.requirements.forEach((req: any) => {
      if (req.tasks) {
        req.tasks.forEach((tsk: any) => {
          if (tsk.test_scenarios) {
            tsk.test_scenarios.forEach((scen: any) => {
              const state = statuses[scen.id];
              if (state) {
                if (typeof state === 'string' && state === 'FAILED') {
                  count++;
                } else if (state.status === 'FAILED') {
                  count++;
                }
              }
            });
          }
        });
      }
    });
    return count;
  });

  protected readonly testProgressPercentage = computed(() => {
    const total = this.totalTestScenariosCount();
    if (total === 0) return 0;
    const passed = this.passedTestScenariosCount();
    return Math.round((passed / total) * 100);
  });

  constructor(
    private route: ActivatedRoute,
    private api: Api,
    public ts: TranslationService
  ) {}

  getScenarioStatus(scenarioId: string): 'PENDING' | 'PASSED' | 'FAILED' {
    const state = this.testStatuses()[scenarioId];
    if (!state) return 'PENDING';
    if (typeof state === 'string') return state as any;
    return state.status;
  }

  getScenarioComment(scenarioId: string): string {
    const state = this.testStatuses()[scenarioId];
    if (!state || typeof state === 'string') return '';
    return state.comment || '';
  }

  // Active editing scenario form state
  protected readonly activeEditingScenarioId = signal<string | null>(null);
  protected readonly editFormState = signal<{
    status: 'PENDING' | 'PASSED' | 'FAILED';
    comment: string;
    attachEvidence: boolean;
    evidenceFileName: string | null;
  }>({
    status: 'PENDING',
    comment: '',
    attachEvidence: false,
    evidenceFileName: null
  });

  getScenarioEvidence(scenarioId: string): string {
    const state = this.testStatuses()[scenarioId];
    if (!state || typeof state === 'string') return '';
    return state.evidenceFile || '';
  }

  startEditingScenario(scenarioId: string, defaultStatus?: 'PENDING' | 'PASSED' | 'FAILED'): void {
    const existing = this.testStatuses()[scenarioId];
    this.activeEditingScenarioId.set(scenarioId);

    let currentStatus: 'PENDING' | 'PASSED' | 'FAILED' = 'PENDING';
    let currentComment = '';
    let currentEvidence: string | null = null;

    if (existing) {
      if (typeof existing === 'string') {
        currentStatus = existing as any;
      } else {
        currentStatus = existing.status;
        currentComment = existing.comment || '';
        currentEvidence = existing.evidenceFile || null;
      }
    } else if (defaultStatus) {
      currentStatus = defaultStatus;
    }

    this.editFormState.set({
      status: currentStatus,
      comment: currentComment,
      attachEvidence: !!currentEvidence,
      evidenceFileName: currentEvidence
    });
  }

  setEditFormStatus(status: 'PENDING' | 'PASSED' | 'FAILED'): void {
    this.editFormState.update(prev => ({
      ...prev,
      status
    }));
  }

  onEditFormCommentInput(event: Event): void {
    const val = (event.target as HTMLTextAreaElement).value;
    this.editFormState.update(prev => ({
      ...prev,
      comment: val
    }));
  }

  setEditFormEvidence(attach: boolean): void {
    this.editFormState.update(prev => ({
      ...prev,
      attachEvidence: attach,
      evidenceFileName: attach ? prev.evidenceFileName : null
    }));
  }

  triggerFileInput(scenId: string): void {
    const input = document.getElementById(`file-input-${scenId}`) as HTMLInputElement;
    if (input) {
      input.click();
    }
  }

  onEvidenceFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.api.uploadEvidence(file).subscribe({
        next: (res) => {
          this.editFormState.update(prev => ({
            ...prev,
            evidenceFileName: res.filename
          }));
        },
        error: (err) => console.error('Failed to upload evidence file', err)
      });
    }
  }

  getEvidenceUrl(filename: string): string {
    return this.api.getEvidenceUrl(filename);
  }


  saveScenarioEdit(): void {
    const scenarioId = this.activeEditingScenarioId();
    const doc = this.document();
    if (!scenarioId || !doc) return;

    const state = this.editFormState();
    if (state.status === 'FAILED' && !state.comment.trim()) {
      return;
    }

    const payload = {
      status: state.status,
      comment: state.comment.trim() ? state.comment.trim() : undefined,
      evidence_file: state.attachEvidence && state.evidenceFileName ? state.evidenceFileName : undefined
    };

    // Optimistic UI update
    const current = { ...this.testStatuses() };
    current[scenarioId] = {
      status: state.status,
      comment: payload.comment,
      evidenceFile: payload.evidence_file
    } as any;

    this.testStatuses.set(current);
    localStorage.setItem(`reqai_tests_${doc.id}`, JSON.stringify(current));

    // Persist to backend database
    this.api.updateTestScenario(doc.id, scenarioId, payload).subscribe({
      error: (err) => console.error('Failed to save test scenario to backend', err)
    });

    // Close the editor
    this.activeEditingScenarioId.set(null);
  }

  cancelScenarioEdit(): void {
    this.activeEditingScenarioId.set(null);
  }

  ngOnInit(): void {
    const docId = this.route.snapshot.paramMap.get('id');
    if (docId) {
      this.loadDocumentDetails(docId);
    } else {
      this.errorMessage.set(this.ts.t('detail.invalidRef'));
      this.isLoading.set(false);
    }
  }

  loadDocumentDetails(id: string): void {
    const stored = localStorage.getItem(`reqai_tests_${id}`);
    if (stored) {
      try {
        this.testStatuses.set(JSON.parse(stored));
      } catch (e) {
        console.error('Error parsing stored test statuses', e);
      }
    } else {
      this.testStatuses.set({});
    }

    this.api.getDocument(id).subscribe({
      next: (data) => {
        if (data && data.requirements) {
          const statusMap = { ...this.testStatuses() };
          data.requirements.forEach((req: any, idx: number) => {
            req.displayIndex = idx + 1;
            if (req.tasks) {
              req.tasks.forEach((task: any, tIdx: number) => {
                task.displayIndex = tIdx + 1;
                if (task.test_scenarios) {
                  task.test_scenarios.forEach((scen: any) => {
                    // DB status overrides localStorage if set
                    if (scen.status) {
                      statusMap[scen.id] = {
                        status: scen.status,
                        comment: scen.comment || undefined,
                        evidenceFile: scen.evidence_file || undefined
                      };
                    }
                  });
                }
              });
            }
          });
          this.testStatuses.set(statusMap);
        }
        this.document.set(data);
        this.isLoading.set(false);

        // Auto-poll if analysis is processing in background
        if (data.status === 'PROCESSING' || data.status === 'UPLOADED') {
          if (!this.pollTimer) {
            this.pollTimer = setInterval(() => {
              this.loadDocumentDetails(id);
            }, 3000);
          }
        } else {
          this.stopPolling();
        }
      },
      error: (err) => {
        this.errorMessage.set(this.ts.t('detail.loadError'));
        this.isLoading.set(false);
        this.stopPolling();
        console.error(err);
      }
    });
  }



  toggleRequirement(reqId: any): void {
    if (this.activeRequirementId() === reqId) {
      this.activeRequirementId.set(null);
    } else {
      this.activeRequirementId.set(reqId);
    }
  }

  startEdit(req: any): void {
    this.editingRequirementId.set(req.id);
    this.editTitle.set(req.title);
    this.editDescription.set(req.description);
    this.editPriority.set(req.priority);
  }

  cancelEdit(): void {
    this.editingRequirementId.set(null);
  }

  onTitleInput(event: Event): void {
    this.editTitle.set((event.target as HTMLInputElement).value);
  }

  onDescriptionInput(event: Event): void {
    this.editDescription.set((event.target as HTMLTextAreaElement).value);
  }

  onPrioritySelect(event: Event): void {
    this.editPriority.set((event.target as HTMLSelectElement).value);
  }

  saveEdit(reqId: string): void {
    const doc = this.document();
    if (!doc) return;

    this.api.updateRequirement(doc.id, reqId, {
      title: this.editTitle(),
      description: this.editDescription(),
      priority: this.editPriority()
    }).subscribe({
      next: () => {
        this.loadDocumentDetails(doc.id);
        this.cancelEdit();
      },
      error: (err) => {
        alert(this.ts.t('detail.loadError'));
        console.error(err);
      }
    });
  }

  exportToJiraCsv(): void {
    const doc = this.document();
    if (!doc || !doc.requirements) return;

    const isTr = this.ts.currentLang() === 'tr';
    
    // Excel support: add separator indicator at the very top
    let csvContent = 'sep=,\n';
    
    // Localized Headers
    const headers = isTr 
      ? 'Tip,Kod,Başlık,Açıklama,Öncelik,Karmaşıklık\n'
      : 'Type,Code,Title,Description,Priority,Complexity\n';
    csvContent += headers;

    doc.requirements.forEach((req: any, reqIdx: number) => {
      const reqId = `REQ-${reqIdx + 1}`;
      const reqTitle = req.title.replace(/"/g, '""');
      const reqDesc = req.description.replace(/"/g, '""');
      const reqType = isTr ? 'Gereksinim' : 'Requirement';
      
      // Add Requirement Row
      csvContent += `"${reqType}","${reqId}","${reqTitle}","${reqDesc}","${req.priority}",""\n`;

      if (req.tasks) {
        req.tasks.forEach((task: any, taskIdx: number) => {
          const taskId = `TSK-${reqIdx + 1}.${taskIdx + 1}`;
          const taskTitle = task.title.replace(/"/g, '""');
          const taskDesc = task.description.replace(/"/g, '""');
          const taskType = isTr ? 'Görev' : 'Task';
          
          // Add Task Row (with ASCII tree symbol for Excel compatibility)
          csvContent += `"${taskType}","${taskId}","  |- ${taskTitle}","${taskDesc}","${task.priority}","${task.complexity}"\n`;
          
          if (task.test_scenarios) {
            task.test_scenarios.forEach((scenario: any) => {
              const scenarioDesc = scenario.expected_result.replace(/"/g, '""');
              const scenarioType = isTr ? 'Kabul Kriteri' : 'Acceptance Criteria';
              csvContent += `"${scenarioType}","","    - ${isTr ? 'Beklenen Sonuç' : 'Expected Result'}: ${scenarioDesc}","","",""\n`;
            });
          }
        });
      }
      
      // Blank separator row
      csvContent += '"","","","","",""\n';
    });

    // Use UTF-8 BOM so Excel opens it with correct Turkish characters encoding
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${doc.filename.split('.')[0]}_backlog_${this.ts.currentLang()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  exportToPdf(): void {
    window.print();
  }

  toggleDownloadOptions(): void {
    this.showDownloadOptions.set(!this.showDownloadOptions());
  }

  exportToMarkdown(): void {
    const doc = this.document();
    if (!doc || !doc.requirements) return;

    const isTr = this.ts.currentLang() === 'tr';
    
    let mdContent = `# ${isTr ? 'Gereksinim Çözümleme Backlog Raporu' : 'Requirement Decomposition Backlog Report'}\n\n`;
    mdContent += `* **${isTr ? 'Doküman Adı' : 'Document Name'}:** ${doc.filename}\n`;
    mdContent += `* **${isTr ? 'Analiz Tarihi' : 'Analysis Date'}:** ${new Date(doc.uploaded_at).toLocaleString(isTr ? 'tr-TR' : 'en-US')}\n`;
    mdContent += `* **${isTr ? 'Durum' : 'Status'}:** ${doc.status}\n\n`;
    
    mdContent += `---\n\n`;

    doc.requirements.forEach((req: any, reqIdx: number) => {
      mdContent += `## 📌 REQ-${reqIdx + 1}: ${req.title} [${req.priority}]\n`;
      mdContent += `*${req.description}*\n\n`;

      if (req.tasks && req.tasks.length > 0) {
        mdContent += `### ⚙️ ${isTr ? 'Geliştirme Görevleri' : 'Developer Tasks'}\n\n`;
        
        req.tasks.forEach((task: any, taskIdx: number) => {
          mdContent += `#### Task ${reqIdx + 1}.${taskIdx + 1}: ${task.title} [${task.priority} | ${task.complexity}]\n`;
          mdContent += `${task.description}\n\n`;

          if (task.test_scenarios && task.test_scenarios.length > 0) {
            mdContent += `**🧪 ${isTr ? 'Kabul Kriterleri (Test Senaryoları)' : 'Acceptance Criteria (Test Scenarios)'}:**\n`;
            task.test_scenarios.forEach((scenario: any) => {
              mdContent += `- [ ] **${isTr ? 'Beklenen Sonuç' : 'Expected Result'}:** ${scenario.expected_result}\n`;
            });
            mdContent += `\n`;
          }
        });
      }
      
      mdContent += `---\n\n`;
    });

    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${doc.filename.split('.')[0]}_backlog_${this.ts.currentLang()}.md`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  toggleTestFilter(filter: 'ALL' | 'PASSED' | 'FAILED'): void {
    if (this.selectedTestFilter() === filter) {
      this.selectedTestFilter.set('ALL');
    } else {
      this.selectedTestFilter.set(filter);
    }
  }

  protected readonly filteredRequirements = computed(() => {
    const doc = this.document();
    if (!doc || !doc.requirements) return [];
    
    const priorityFilter = this.selectedPriorityFilter();
    let reqs = doc.requirements;
    if (priorityFilter !== 'ALL') {
      reqs = reqs.filter((req: any) => req.priority === priorityFilter);
    }
    
    const testFilter = this.selectedTestFilter();
    if (testFilter !== 'ALL') {
      reqs = reqs.filter((req: any) => {
        return req.tasks && req.tasks.some((task: any) => {
          return task.test_scenarios && task.test_scenarios.some((scen: any) => {
            return this.getScenarioStatus(scen.id) === testFilter;
          });
        });
      });
    }
    
    return reqs;
  });

  getPriorityCount(priority: string): number {
    const doc = this.document();
    if (!doc || !doc.requirements) return 0;
    if (priority === 'ALL') return doc.requirements.length;
    return doc.requirements.filter((req: any) => req.priority === priority).length;
  }

  // Resizable split layout panel width signal (percent for left panel, 20% - 75%)
  protected readonly leftPanelWidthPercent = signal<number>(40);
  protected readonly isResizingSplit = signal<boolean>(false);
  protected readonly highlightedSnippet = signal<string | null>(null);

  startSplitResize(event: MouseEvent): void {
    event.preventDefault();
    this.isResizingSplit.set(true);

    const onMouseMove = (e: MouseEvent) => {
      if (!this.isResizingSplit()) return;
      const splitLayout = document.querySelector('.split-layout') as HTMLElement;
      if (!splitLayout) return;

      const rect = splitLayout.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      let percent = (offsetX / rect.width) * 100;

      // Clamp between 20% and 75%
      percent = Math.max(20, Math.min(75, percent));
      this.leftPanelWidthPercent.set(percent);
    };

    const onMouseUp = () => {
      this.isResizingSplit.set(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  scrollToAndHighlightRawText(req: any): void {
    if (!req) return;

    this.activeRequirementId.set(req.id);
    const content = this.document()?.content || '';
    if (!content) return;

    // Find words from req title
    const keywords = (req.title || '').split(' ').filter((w: string) => w.length > 3);
    let matchIdx = -1;

    for (const kw of keywords) {
      const found = content.toLowerCase().indexOf(kw.toLowerCase());
      if (found !== -1) {
        matchIdx = found;
        break;
      }
    }

    if (matchIdx !== -1) {
      const textBefore = content.substring(0, matchIdx);
      const linesBefore = textBefore.split('\n').length;
      const totalLines = content.split('\n').length;
      const scrollPercent = linesBefore / totalLines;

      const rawBody = document.querySelector('.raw-content-body') as HTMLElement;
      if (rawBody) {
        const targetScroll = Math.max(0, scrollPercent * rawBody.scrollHeight - 60);
        rawBody.scrollTo({
          top: targetScroll,
          behavior: 'smooth'
        });
      }

      const snippet = content.substring(matchIdx, Math.min(content.length, matchIdx + 80));
      this.highlightedSnippet.set(snippet);

      setTimeout(() => {
        if (this.highlightedSnippet() === snippet) {
          this.highlightedSnippet.set(null);
        }
      }, 3500);
    }
  }
}
