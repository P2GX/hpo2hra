import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

const SEARCH_URL = 'https://ontology.jax.org/api/hp/search';
const MIN_QUERY_LENGTH = 3;
const RESULT_LIMIT = 20;

export interface HpoTerm {
  id: string;
  name: string;
}

interface SearchResponse {
  terms: HpoTerm[];
  totalCount: number;
}

@Injectable({ providedIn: 'root' })
export class HpoTerms {
  private http = inject(HttpClient);

  search(query: string): Observable<HpoTerm[]> {
    if (query.trim().length < MIN_QUERY_LENGTH) return of([]);

    return this.http
      .get<SearchResponse>(SEARCH_URL, {
        params: { q: query, page: 0, limit: RESULT_LIMIT },
      })
      .pipe(
        map((response) => response.terms.map((t) => ({ id: t.id, name: t.name }))),
        catchError(() => of([]))
      );
  }
}
