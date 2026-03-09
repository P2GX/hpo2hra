import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-hpo-input-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './hpo-input-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class HpoInputFormComponent {
  private fb = inject(FormBuilder);

  protected userForm = this.fb.group({
    termId: ['', [Validators.required, Validators.pattern('^HP:\\d{7}$')]],
  });

  protected onSubmit(): void {
    if (this.userForm.valid) {
      console.log(this.userForm.value);
    }
  }
}
