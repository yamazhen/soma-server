import gc
import json
from typing import Any, Dict

import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer
from model.DeckTypes import Deck
from model.NoteTypes import MarkdownNote
from model.QuizTypes import Quiz


class CustomEducationalModel:
    def __init__(self, model_path: str = "llama32-fine-tuned"):
        self.device = "mps" if torch.backends.mps.is_available() else "cpu"
        torch.set_num_threads(2)

        print(f"Loading model on {self.device}...")

        base_model_name = "unsloth/Llama-3.2-1B-Instruct"
        self.tokenizer = AutoTokenizer.from_pretrained(
            base_model_name, use_fast=True, trust_remote_code=True
        )

        self.model = AutoModelForCausalLM.from_pretrained(
            base_model_name,
            torch_dtype=torch.float16,
            device_map="auto",
            low_cpu_mem_usage=True,
            use_cache=True,
            attn_implementation="eager",
        )

        self.model = PeftModel.from_pretrained(
            self.model, model_path, torch_dtype=torch.float16
        )

        self.model = self.model.to(self.device)
        if self.device == "mps":
            self.model.half()

        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token
            self.tokenizer.pad_token_id = self.tokenizer.eos_token_id

        self.model.eval()

        torch.cuda.empty_cache() if torch.cuda.is_available() else gc.collect()

        print("Model loaded!")

    def generate(self, prompt: str, max_tokens: int = 128) -> str:
        gc.collect()

        formatted_prompt = f"User: {prompt}\nAssistant:"

        inputs = self.tokenizer(
            formatted_prompt,
            return_tensors="pt",
            padding=False,
            truncation=True,
            max_length=512,
            return_attention_mask=True,
        )

        input_ids = inputs["input_ids"].to(self.device)
        attention_mask = inputs["attention_mask"].to(self.device)
        input_length = input_ids.shape[1]

        with torch.no_grad():
            if self.device == "mps":
                outputs = self.model.generate(
                    input_ids=input_ids,
                    attention_mask=attention_mask,
                    max_new_tokens=min(max_tokens, 256),
                    temperature=0.7,
                    do_sample=True,
                    top_p=0.9,
                    pad_token_id=self.tokenizer.pad_token_id,
                    eos_token_id=self.tokenizer.eos_token_id,
                    use_cache=True,
                    repetition_penalty=1.1,
                )
            else:
                with torch.autocast(device_type="cpu", dtype=torch.float16):
                    outputs = self.model.generate(
                        input_ids=input_ids,
                        attention_mask=attention_mask,
                        max_new_tokens=min(max_tokens, 256),
                        temperature=0.7,
                        do_sample=True,
                        top_p=0.9,
                        pad_token_id=self.tokenizer.pad_token_id,
                        eos_token_id=self.tokenizer.eos_token_id,
                        use_cache=True,
                        repetition_penalty=1.1,
                    )

            new_tokens = outputs[0][input_length:]
            response = self.tokenizer.decode(new_tokens, skip_special_tokens=True)

            response = response.split("User:")[0].split("Assistant:")[0].strip()

            gc.collect()

            return response

    def generate_structured(
        self, prompt: str, schema_type: str, max_tokens: int = 512
    ) -> Dict[str, Any]:
        schema_prompts = {
            "quiz": """Generate a quiz in valid JSON format following this exact structure:
{
  "title": "Quiz Title",
  "questions": [
    {
      "text": "Question text?",
      "type": "multiple-choice",
      "options": [
        {"text": "Option A", "is_correct": false},
        {"text": "Option B", "is_correct": true},
        {"text": "Option C", "is_correct": false},
        {"text": "Option D", "is_correct": false}
      ]
    }
  ]
}
Return ONLY valid JSON, no other text.""",
            "deck": """Generate flashcards in valid JSON format following this exact structure:
{
  "title": "Deck Title",
  "cards": [
    {"front": "Front of card", "back": "Back of card"}
  ]
}
Return ONLY valid JSON, no other text.""",
            "note": """Generate a markdown note in valid JSON format following this exact structure:
{
  "title": "Note Title",
  "content": "# Title\\n\\nContent with markdown formatting"
}
Return ONLY valid JSON, no other text.""",
        }

        structured_prompt = f"{prompt}\n\n{schema_prompts[schema_type]}"

        response = self.generate(structured_prompt, max_tokens)

        try:
            json_start = response.find("{")
            json_end = response.rfind("}") + 1

            if json_start != -1 and json_end > json_start:
                json_str = response[json_start:json_end]
                return json.loads(json_str)
            else:
                return json.loads(response.strip())
        except json.JSONDecodeError as e:
            print(f"JSON decode error: {e}")
            print(f"Raw response: {response}")
            raise ValueError(f"Failed to parse structured response: {e}")


_model = None


def get_model():
    global _model
    if _model is None:
        _model = CustomEducationalModel()
    return _model


def generate_quiz_llama(source: str, num_questions: int) -> Quiz:
    model = get_model()
    prompt = f"Generate a quiz with {num_questions} questions based on the following content:\n\n{source}"
    result = model.generate_structured(prompt, "quiz", max_tokens=1024)
    return Quiz.model_validate(result)

def generate_deck_llama(source: str, num_cards: int) -> Deck:
    model = get_model()
    prompt = f"Generate a flashcard deck with {num_cards} cards based on the following content:\n\n{source}"
    result = model.generate_structured(prompt, "deck", max_tokens=1024)
    return Deck.model_validate(result)

def generate_note_llama(source: str) -> MarkdownNote:
    model = get_model()
    prompt = f"Generate a markdown note based on the following content:\n\n{source}"
    result = model.generate_structured(prompt, "note", max_tokens=1024)
    return MarkdownNote.model_validate(result)
