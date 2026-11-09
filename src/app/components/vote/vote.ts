import { Component, OnInit } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-vote',
  styleUrl: './vote.css',
  templateUrl: './vote.html',
})
export class Vote implements OnInit {
  protected email = '';

  ngOnInit(): void {
    this.email = this.getSavedEmail();
  }

  protected submitEmail(event: SubmitEvent, email: string): void {
    event.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    this.email = trimmedEmail;
    sessionStorage.setItem('email', trimmedEmail);
  }

  private getSavedEmail(): string {
    const sessionEmail = sessionStorage.getItem('email');
    if (sessionEmail) return sessionEmail;

    const cookie = document.cookie
      .split('; ')
      .find((entry) => entry.startsWith('email='));

    return cookie ? decodeURIComponent(cookie.slice('email='.length)) : '';
  }
}
