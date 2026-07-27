import { Component, signal, OnInit, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Api } from '../../services/api';
import { TranslationService } from '../../services/translation.service';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';

interface ScenarioState {
  status: 'PENDING' | 'PASSED' | 'FAILED';
  comment?: string;
  evidenceFile?: string;
}

@Component({
  selector: 'app-monitor',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatTooltipModule
  ],
  templateUrl: './monitor.html',
  styleUrls: ['./monitor.scss']
})
export class Monitor implements OnInit {
  // Loading & error signals
  protected readonly isLoading = signal(true);
  protected readonly isDetailLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  // Animated gauge progress signal for smooth count-up fill animation
  protected readonly animatedGaugeProgress = signal<number>(0);
  private gaugeAnimationId: any = null;

  // List of all documents with computed health/stats
  protected readonly jobs = signal<any[]>([]);

  // Selected document details
  protected readonly selectedJob = signal<any | null>(null);

  // Local copy of test statuses for the selected document
  protected readonly currentTestStatuses = signal<Record<string, ScenarioState>>({});

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

  constructor(
    private api: Api,
    public ts: TranslationService
  ) {
    // Reactively animate gauge when selectedJobProgress updates
    effect(() => {
      const target = this.selectedJobProgress();
      this.animateGaugeTo(target);
    });
  }

  private animateGaugeTo(target: number): void {
    if (this.gaugeAnimationId) {
      cancelAnimationFrame(this.gaugeAnimationId);
    }

    const start = this.animatedGaugeProgress();
    const duration = 800; // 800ms ease-out cubic animation
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (target - start) * easeOut);

      this.animatedGaugeProgress.set(current);

      if (progress < 1) {
        this.gaugeAnimationId = requestAnimationFrame(step);
      }
    };

    this.gaugeAnimationId = requestAnimationFrame(step);
  }

  ngOnInit(): void {
    this.loadJobs();
  }

  loadJobs(): void {
    this.isLoading.set(true);
    // Fetch top 50 documents to monitor
    this.api.getDocuments(0, 50).subscribe({
      next: (res) => {
        const docs = res.items || [];
        if (docs.length === 0) {
          this.jobs.set([]);
          this.isLoading.set(false);
          return;
        }

        // Fetch detailed tree for all documents in parallel to get exact scenario counts
        const detailObservables = docs.map((doc: any) => this.api.getDocument(doc.id));
        (forkJoin(detailObservables) as any).subscribe({
          next: (detailedDocs: any[]) => {
            const processedJobs = detailedDocs.map((doc: any) => {
              return this.calculateJobStats(doc);
            });
            this.jobs.set(processedJobs);
            this.isLoading.set(false);
          },
          error: (err: any) => {
            this.errorMessage.set(this.ts.t('monitor.loadError'));
            this.isLoading.set(false);
            console.error(err);
          }
        });
      },
      error: (err) => {
        this.errorMessage.set(this.ts.t('monitor.loadError'));
        this.isLoading.set(false);
        console.error(err);
      }
    });
  }

  calculateJobStats(doc: any): any {
    // If document is not ANALYZED, status is pending
    if (doc.status !== 'ANALYZED') {
      return {
        ...doc,
        health: 'PENDING',
        completionRate: 0,
        passedCount: 0,
        failedCount: 0,
        totalScenarios: 0
      };
    }

    const stored = localStorage.getItem(`reqai_tests_${doc.id}`);
    const testStatuses: Record<string, any> = stored ? JSON.parse(stored) : {};

    let totalScenarios = 0;
    let passedScenarios = 0;
    let failedScenarios = 0;

    // Calculate progress directly from the nested database tree
    if (doc.requirements) {
      doc.requirements.forEach((req: any) => {
        if (req.tasks) {
          req.tasks.forEach((task: any) => {
            if (task.test_scenarios) {
              task.test_scenarios.forEach((scen: any) => {
                totalScenarios++;
                const state = testStatuses[scen.id];
                const status = state ? (typeof state === 'string' ? state : state.status) : (scen.status || 'PENDING');
                if (status === 'PASSED') passedScenarios++;
                if (status === 'FAILED') failedScenarios++;
              });
            }
          });
        }
      });
    }

    // Determine health based on failures
    let health = 'HEALTHY';
    if (failedScenarios > 0) {
      health = 'WARNING';
    } else if (totalScenarios === 0 || passedScenarios < totalScenarios) {
      health = 'PENDING';
    }

    const completionRate = totalScenarios > 0 ? Math.round((passedScenarios / totalScenarios) * 100) : 0;

    return {
      ...doc,
      health,
      completionRate,
      passedCount: passedScenarios,
      failedCount: failedScenarios,
      totalScenarios
    };
  }

  selectJob(job: any): void {
    if (this.selectedJob()?.id === job.id) {
      return;
    }
    // Cancel editing
    this.activeEditingScenarioId.set(null);

    // Load stored test statuses from local storage
    const stored = localStorage.getItem(`reqai_tests_${job.id}`);
    const testStatuses: Record<string, ScenarioState> = stored ? JSON.parse(stored) : {};

    // DB status overrides localStorage if set
    if (job.requirements) {
      job.requirements.forEach((req: any) => {
        if (req.tasks) {
          req.tasks.forEach((task: any) => {
            if (task.test_scenarios) {
              task.test_scenarios.forEach((scen: any) => {
                const sId = String(scen.id);
                if (scen.status) {
                  testStatuses[sId] = {
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
    }

    this.currentTestStatuses.set(testStatuses);
    this.selectedJob.set(job);
  }

  // Get scenario status helper
  getScenarioStatus(scenarioId: any, fallbackStatus?: string): 'PENDING' | 'PASSED' | 'FAILED' {
    const sId = String(scenarioId);
    const state = this.currentTestStatuses()[sId];
    if (state) {
      return (typeof state === 'string' ? state : state.status) as any;
    }
    if (fallbackStatus) {
      return fallbackStatus as any;
    }
    return 'PENDING';
  }

  getScenarioComment(scenarioId: any): string | undefined {
    const sId = String(scenarioId);
    const state = this.currentTestStatuses()[sId];
    if (!state || typeof state === 'string') return undefined;
    return state.comment;
  }

  getScenarioEvidence(scenarioId: any): string | undefined {
    const sId = String(scenarioId);
    const state = this.currentTestStatuses()[sId];
    if (!state || typeof state === 'string') return undefined;
    return state.evidenceFile;
  }

  // Inline Status Editor controls
  startEditingScenario(scenarioId: any, defaultStatus?: 'PENDING' | 'PASSED' | 'FAILED'): void {
    const currentStatus = this.getScenarioStatus(scenarioId);
    const currentComment = this.getScenarioComment(scenarioId) || '';
    const currentEvidence = this.getScenarioEvidence(scenarioId) || '';

    this.activeEditingScenarioId.set(String(scenarioId));
    this.editFormState.set({
      status: currentStatus || defaultStatus || 'PENDING',
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
    const target = event.target as HTMLTextAreaElement;
    this.editFormState.update(prev => ({
      ...prev,
      comment: target.value
    }));
  }

  setEditFormEvidence(attach: boolean): void {
    this.editFormState.update(prev => ({
      ...prev,
      attachEvidence: attach,
      evidenceFileName: attach ? prev.evidenceFileName : ''
    }));
  }


  triggerFileInput(scenarioId: any): void {
    const input = document.getElementById(`file-input-${scenarioId}`) as HTMLInputElement;
    if (input) {
      input.click();
    }
  }

  onEvidenceFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      this.api.uploadEvidence(file).subscribe({
        next: (res) => {
          this.editFormState.update(prev => ({
            ...prev,
            evidenceFileName: res.filename
          }));
        },
        error: (err) => console.error('Evidence upload failed', err)
      });
    }
  }

  getEvidenceUrl(filename: string): string {
    return this.api.getEvidenceUrl(filename);
  }


  saveScenarioEdit(): void {
    const scenarioId = this.activeEditingScenarioId();
    const job = this.selectedJob();
    if (!scenarioId || !job) return;

    const state = this.editFormState();
    if (state.status === 'FAILED' && !state.comment.trim()) {
      return;
    }

    const payload = {
      status: state.status,
      comment: state.comment.trim() ? state.comment.trim() : undefined,
      evidence_file: state.attachEvidence && state.evidenceFileName ? state.evidenceFileName : undefined
    };

    const sId = String(scenarioId);
    const current = { ...this.currentTestStatuses() };
    current[sId] = {
      status: state.status,
      comment: payload.comment,
      evidenceFile: payload.evidence_file
    };

    // Update in-memory selectedJob object model to trigger immediate computed updates
    const jobCopy = structuredClone(job);
    if (jobCopy.requirements) {
      jobCopy.requirements.forEach((req: any) => {
        if (req.tasks) {
          req.tasks.forEach((task: any) => {
            if (task.test_scenarios) {
              task.test_scenarios.forEach((scen: any) => {
                if (String(scen.id) === sId) {
                  scen.status = state.status;
                  scen.comment = payload.comment;
                  scen.evidence_file = payload.evidence_file;
                }
              });
            }
          });
        }
      });
    }

    this.currentTestStatuses.set(current);
    this.selectedJob.set(jobCopy);
    localStorage.setItem(`reqai_tests_${job.id}`, JSON.stringify(current));

    // Persist to backend DB
    this.api.updateTestScenario(job.id, sId, payload).subscribe({
      error: (err) => console.error('Failed to update test scenario in backend', err)
    });

    // Update the job in the main jobs list to reflect stats instantly
    this.syncJobStats(job.id);

    // Close the editor
    this.activeEditingScenarioId.set(null);
  }

  cancelScenarioEdit(): void {
    this.activeEditingScenarioId.set(null);
  }

  // Categorize requirements for selected job
  protected readonly completedRequirements = computed(() => {
    const job = this.selectedJob();
    if (!job || !job.requirements) return [];
    
    // Subscribe to test statuses signal for reactivity
    const statuses = this.currentTestStatuses();

    return job.requirements.filter((req: any) => {
      let hasPassed = false;

      if (req.tasks) {
        req.tasks.forEach((task: any) => {
          if (task.test_scenarios) {
            task.test_scenarios.forEach((scen: any) => {
              const status = this.getScenarioStatus(scen.id, scen.status);
              if (status === 'PASSED') {
                hasPassed = true;
              }
            });
          }
        });
      }

      // Requirement is categorized into completed if it has at least 1 PASSED scenario (mirroring failedRequirements)
      return hasPassed;
    });
  });

  protected readonly failedRequirements = computed(() => {
    const job = this.selectedJob();
    if (!job || !job.requirements) return [];

    // Subscribe to test statuses signal for reactivity
    const statuses = this.currentTestStatuses();

    return job.requirements.filter((req: any) => {
      let hasFail = false;

      if (req.tasks) {
        req.tasks.forEach((task: any) => {
          if (task.test_scenarios) {
            task.test_scenarios.forEach((scen: any) => {
              const status = this.getScenarioStatus(scen.id, scen.status);
              if (status === 'FAILED') {
                hasFail = true;
              }
            });
          }
        });
      }

      return hasFail;
    }).map((req: any) => {
      // Map and attach failing scenarios details to show inline in the UI
      const failedScenariosList: any[] = [];
      if (req.tasks) {
        req.tasks.forEach((task: any) => {
          if (task.test_scenarios) {
            task.test_scenarios.forEach((scen: any) => {
              const status = this.getScenarioStatus(scen.id, scen.status);
              if (status === 'FAILED') {
                failedScenariosList.push({
                  id: scen.id,
                  taskTitle: task.title,
                  title: scen.title,
                  description: scen.description,
                  expectedResult: scen.expected_result,
                  comment: this.getScenarioComment(scen.id),
                  evidenceFile: this.getScenarioEvidence(scen.id)
                });
              }
            });
          }
        });
      }
      return {
        ...req,
        failedScenarios: failedScenariosList
      };
    });
  });

  // Calculate current completion percentage for the selected job in real-time
  protected readonly selectedJobProgress = computed(() => {
    const job = this.selectedJob();
    if (!job || !job.requirements) return 0;

    let totalScenarios = 0;
    let passedScenarios = 0;

    job.requirements.forEach((req: any) => {
      if (req.tasks) {
        req.tasks.forEach((task: any) => {
          if (task.test_scenarios) {
            task.test_scenarios.forEach((scen: any) => {
              totalScenarios++;
              if (this.getScenarioStatus(scen.id, scen.status) === 'PASSED') {
                passedScenarios++;
              }
            });
          }
        });
      }
    });

    if (totalScenarios === 0) return 100;
    return Math.round((passedScenarios / totalScenarios) * 100);
  });

  // Helper to sync stats of a single job back into the main jobs array
  syncJobStats(jobId: string): void {
    const updatedJobs = this.jobs().map((j: any) => {
      if (j.id === jobId) {
        return this.calculateJobStats(j);
      }
      return j;
    });
    this.jobs.set(updatedJobs);

    // Also update selectedJob if it's the active one to trigger reactive signals
    const selected = this.selectedJob();
    if (selected && selected.id === jobId) {
      const updatedSelected = updatedJobs.find((j: any) => j.id === jobId);
      this.selectedJob.set(updatedSelected);
    }
  }

  // Helper to get priority color for badge
  getPriorityClass(priority: string): string {
    return (priority || 'MEDIUM').toLowerCase();
  }
}

