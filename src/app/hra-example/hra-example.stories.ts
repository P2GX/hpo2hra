import { Meta, StoryObj, applicationConfig } from '@storybook/angular';
import { of } from 'rxjs';
import { HraExample } from './hra-example'; 
import { HpoMapService } from '../service/hpo-mapper';
import { HraKgService, V1Service } from '@hra-api/ng-client';

// 1. Create robust mock instances for the injected services
const mockHpoMapService: Partial<HpoMapService> = {
  getRecord: ((purl: string) => {
    if (purl.includes('HP_0410157')) {
      return { term: 'UBERON:0002081' };
    }
    return { term: 'UBERON:0001229' };
  }) as any
};

const mockV1Service: Partial<V1Service> = {
  // Casting the function to 'any' satisfies the overloaded signatures
  sparqlPost: (() => {
    return of({
      results: {
        bindings: [
          { sub: { value: 'test-sub' }, pred: { value: 'test-pred' }, obj: { value: 'test-obj' } }
        ]
      }
    });
  }) as any
};

const mockHraKgService: Partial<HraKgService> = {
  // Add any specific methods if your template or future logic calls api2
};

// 2. Define Storybook Metadata
const meta: Meta<HraExample> = {
  title: 'Components/HraExample',
  component: HraExample,
  tags: ['autodocs'],
  decorators: [
    applicationConfig({
      providers: [
        // Inject our mock configurations into the Angular DI container
        { provide: HpoMapService, useValue: mockHpoMapService },
        { provide: V1Service, useValue: mockV1Service },
        { provide: HraKgService, useValue: mockHraKgService },
      ],
    }),
  ],
  argTypes: {
    // Visual control overrides for the Storybook UI panel
    uberon: { control: 'text' },
    hpo_target: { control: 'text' },
    cellStructures: { control: 'object' },
  },
};

export default meta;
type Story = StoryObj<HraExample>;

// 3. Define the Stories (Variants)
export const Default: Story = {
  args: {
    hpo_target: 'HP:0410157',
    uberon: 'UBERON:0001229',
    cellStructures: ['CL:123', 'CL:456'],
  },
};

export const AlternateTarget: Story = {
  args: {
    hpo_target: 'HP:0003300',
    uberon: 'UBERON:0002081',
    cellStructures: ['CL:789'],
  },
};

export const MissingMapping: Story = {
  args: {
    hpo_target: 'HP:0000000', // Will fallback to 'Could not retrieve UBERON...'
    uberon: 'UBERON:unknown',
    cellStructures: [],
  },
};