<script setup lang="ts">
/** Mono form field in the 2px frame, with its label and an error line. */
const props = withDefaults(
  defineProps<{
    label: string
    name: string
    type?: string
    required?: boolean
    autocomplete?: string
    placeholder?: string
    textarea?: boolean
    error?: string
  }>(),
  { type: 'text' },
)

const model = defineModel<string>({ default: '' })
const id = computed(() => `field-${props.name}`)
</script>

<template>
  <div>
    <label :for="id" class="b-label">{{ label }}<template v-if="required"> *</template></label>
    <textarea
      v-if="textarea"
      :id="id"
      v-model="model"
      class="b-field"
      :name="name"
      :required="required"
      :placeholder="placeholder"
      rows="4"
      :aria-invalid="error ? true : undefined"
      :aria-describedby="error ? `${id}-error` : undefined"
    />
    <input
      v-else
      :id="id"
      v-model="model"
      class="b-field"
      :type="type"
      :name="name"
      :required="required"
      :autocomplete="autocomplete"
      :placeholder="placeholder"
      :aria-invalid="error ? true : undefined"
      :aria-describedby="error ? `${id}-error` : undefined"
    >
    <p v-if="error" :id="`${id}-error`" class="b-caption field-error">{{ error }}</p>
  </div>
</template>

<style scoped>
.field-error {
  color: var(--jacaranda-deep);
  margin-top: 6px;
}
</style>
