import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { TranslationService } from './services/translation.service';
import { ThemeService } from './services/theme.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatTooltipModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('reqai-frontend');
  protected readonly isMonitorRoute = signal(false);

  constructor(
    public ts: TranslationService,
    public themeService: ThemeService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.isMonitorRoute.set(event.urlAfterRedirects.includes('/monitor'));
    });
    // Initial check
    this.isMonitorRoute.set(this.router.url.includes('/monitor'));
  }
}
