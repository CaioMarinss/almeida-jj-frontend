import { compose } from './ambiente';

export function executarSql(sql: string): void {
  compose(`exec -T db psql -v ON_ERROR_STOP=1 -U postgres -d almeidajj -c "${sql}"`);
}
