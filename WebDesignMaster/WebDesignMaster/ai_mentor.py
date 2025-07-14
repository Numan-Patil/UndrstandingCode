import os
import json
import requests
from typing import Dict, Any, Optional


class AIMentor:

    def __init__(self):
        # Try multiple API keys as fallbacks - put your new key first
        self.api_keys = [
            os.getenv("OPENROUTER_API_KEY"),
            # Add your new API key here as the primary fallback
            # Replace "YOUR_NEW_API_KEY_HERE" with your actual API key
            "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",
            "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",
            "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"
        ]
        # Filter out None values and placeholder keys
        self.api_keys = [key for key in self.api_keys if key and not key.startswith("YOUR_")]

        self.current_key_index = 0
        self.api_key = self.api_keys[0] if self.api_keys else "sk-or-v1-fallback-key"

        # Debug: Print which key is being used (remove in production)
        print(f"Using API key: {self.api_key[:20]}..." if self.api_key else "No API key found")
        self.base_url = "https://openrouter.ai/api/v1"

        # Try different free models as alternatives
        self.models = [
            "deepseek/deepseek-r1-0528-qwen3-8b:free",
            "meta-llama/llama-3.2-3b-instruct:free",
            "google/gemma-2-9b-it:free"
        ]
        self.current_model_index = 0
        self.model = self.models[0]

        # Core mentor instructions
        self.system_prompt = """You are an AI coding mentor designed to assist users in learning and writing code without directly providing complete solutions. Your behavior should mimic that of a helpful friend who guides users step-by-step, explains concepts clearly, and helps with logic and problem-solving.

IMPORTANT COMMUNICATION STYLE:
- Be conversational and friendly, like talking to a friend
- Use simple, everyday language without excessive technical jargon
- NO markdown formatting (avoid **, ###, ---, numbered lists, bullet points)
- Instead of formal lists, use natural conversational flow
- Keep responses concise and digestible
- Be encouraging and supportive
- When explaining errors, translate technical jargon into plain English

Follow these core principles:

1. No Direct Code Solutions:
   Never output full implementations or complete function definitions. Only offer hints, logic explanations, or simple syntax patterns when needed. Instead of giving the answer, ask guiding questions like "What do you think should happen first?" or "How might you check if a number is even?"

2. Two-Mode Interaction:
   When a user mentions a concept or algorithm, ask if they want to learn about it or start coding it. If they want to learn, direct them to documentation. If they want to code, guide them step by step with specific, actionable hints.

3. Guided Coding Assistance:
   Guide the user by describing what to do next in natural language. Break down problems into logical stages and walk them through each step. Use analogies and real-world examples to make concepts clearer. If they struggle, provide constructive feedback and explanations.

4. Better Approach Suggestions:
   When appropriate, suggest alternative algorithms, data structures, or methods. Explain why alternatives might be better in terms of performance or readability using simple comparisons like "This approach is like organizing books alphabetically versus by color."

5. Error Identification and Explanation:
   When users submit buggy code or encounter errors, translate technical error messages into plain English. Focus on helping them understand why something doesn't work rather than rewriting it. For example, instead of "SyntaxError: invalid syntax", say "It looks like there's a typo or missing punctuation that's confusing Python."

6. Enhanced Error Translation:
   When encountering common errors, explain them in human terms:
   - "NameError" = "Python doesn't recognize that variable name"
   - "IndentationError" = "The spacing at the start of your lines needs to be consistent"
   - "TypeError" = "You're trying to mix different types of data in a way that doesn't work"
   - "IndexError" = "You're trying to access a position in a list that doesn't exist"

7. Tone and Style:
   Be conversational, clear, and educational. Avoid formal structure and markdown. Talk like you're having a friendly conversation about programming. Use phrases like "Let's think about this together" or "Here's what I noticed..."

8. Fallback Handling:
   If a request asks for full code, respond with something like "I can guide you through the process, but I won't provide the full implementation. Let's start with the first step..."

9. Context-Aware Responses:
   Pay attention to the user's skill level and adjust explanations accordingly. For beginners, use more analogies and simpler language. For more advanced users, you can use slightly more technical terms while still keeping it conversational.

Your goal is to empower users to write code on their own while being a supportive, conversational guide. Think of yourself as a friendly coding buddy who helps translate confusing technical stuff into everyday language."""

    def get_response(self,
                     user_input: str,
                     conversation_history: list = None) -> Dict[str, Any]:
        """Get AI mentor response from OpenRouter API"""
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://localhost:5000",
                "X-Title": "CodeMentor AI"
            }

            messages = [{"role": "system", "content": self.system_prompt}]

            # Add conversation history if provided
            if conversation_history:
                messages.extend(conversation_history[-4:]
                                )  # Reduced history to prevent token overflow

            # Add current user input
            messages.append({"role": "user", "content": user_input})

            payload = {
                "model": self.model,
                "messages": messages,
                "temperature":
                0.6,  # Slightly reduced for more consistent responses
                "max_tokens": 2000,  # Further increased to prevent truncation
                "top_p": 0.8,  # Slightly reduced
                "frequency_penalty": 0.2
            }

            response = requests.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
                timeout=30  # Reduced timeout
            )

            print(f"API Response Status: {response.status_code}")

            if response.status_code == 200:
                data = response.json()
                if "choices" in data and len(data["choices"]) > 0:
                    mentor_response = data["choices"][0]["message"]["content"]

                    # Structure the response with status and formatting
                    structured_response = self._structure_response(
                        mentor_response, user_input)

                    # Check if response suggests learning mode
                    is_learning_mode = "learn about this" in structured_response.lower(
                    ) or "documentation" in structured_response.lower()

                    return {
                        "success":
                        True,
                        "response":
                        structured_response,
                        "is_learning_mode":
                        is_learning_mode,
                        "suggested_topic":
                        self._extract_topic(structured_response)
                        if is_learning_mode else None
                    }
                else:
                    return {
                        "success":
                        False,
                        "error":
                        "Invalid API response format",
                        "response":
                        "I received an unexpected response. Let me try a different approach to help you."
                    }
            elif response.status_code == 429:
                # Try different model if rate limited
                if self._rotate_model():
                    return self.get_response(user_input, conversation_history)
                # Enhanced rate limit handling
                return {
                    "success":
                    True,  # Changed to True to provide helpful fallback
                    "response":
                    "🟡 Taking a Breather\n\nI'm getting a lot of questions right now, so I need to slow down a bit. I'm still here to help you learn coding step-by-step!\n\nTry asking your question again in about a minute. In the meantime, feel free to experiment with your code.",
                    "is_learning_mode": False
                }
            elif response.status_code == 401:
                # Try next API key if available
                if self._rotate_api_key():
                    return self.get_response(user_input, conversation_history)
                return {
                    "success":
                    False,
                    "error":
                    "Authentication failed",
                    "response":
                    "🔴 Connection Trouble\n\nI'm having trouble accessing my knowledge base right now. This usually fixes itself in a few minutes.\n\nTry refreshing the page or asking your question again in a moment."
                }
            else:
                print(f"API Error Response: {response.text}")
                return {
                    "success":
                    False,
                    "error":
                    f"API request failed with status {response.status_code}",
                    "response":
                    "🔴 Temporary Hiccup\n\nSomething went wrong on my end, but it's likely temporary. This could be a network issue or the service might be busy.\n\nTry asking your question again in a moment. If it keeps happening, try refreshing the page."
                }

        except requests.exceptions.Timeout:
            return {
                "success":
                False,
                "error":
                "Request timeout",
                "response":
                "🔴 Taking Too Long\n\nYour request is taking longer than expected to process. This might be because the message was too long or the service is busy.\n\nTry asking a shorter, more focused question or wait a moment and try again."
            }
        except requests.exceptions.ConnectionError:
            return {
                "success":
                False,
                "error":
                "Connection error",
                "response":
                "🔴 Can't Connect\n\nI'm having trouble reaching my knowledge base. This could be a network issue on your end or mine.\n\nCheck your internet connection and try again. If the problem persists, try refreshing the page."
            }
        except Exception as e:
            print(f"Unexpected error: {str(e)}")
            # Try to provide more specific error messages based on the exception type
            error_msg = str(e).lower()
            if "json" in error_msg:
                human_msg = "I received a response I couldn't understand. This might be a temporary issue with the service."
            elif "ssl" in error_msg or "certificate" in error_msg:
                human_msg = "There's a security connection issue. Try refreshing the page or checking your internet connection."
            elif "timeout" in error_msg:
                human_msg = "The connection timed out. The service might be busy right now."
            else:
                human_msg = "Something unexpected happened on my end. This is usually temporary."

            return {
                "success":
                False,
                "error":
                str(e),
                "response":
                f"🔴 Technical Hiccup\n\n{human_msg}\n\nTry asking your question again in a moment. If it keeps happening, try refreshing the page."
            }

    def _structure_response(self, response: str, user_input: str) -> str:
        """Structure AI response with status indicators and clear formatting"""
        # Clean the response first
        cleaned = self._clean_response(response)

        # Determine response type and add appropriate status indicator
        status_indicator = self._get_status_indicator(cleaned, user_input)

        # Format the response with clear structure
        if "error" in cleaned.lower() or "problem" in cleaned.lower():
            # Error/Problem detected
            parts = cleaned.split('.', 2)
            if len(parts) >= 2:
                title = parts[0] + "."
                description = ". ".join(parts[1:]).strip()
                return f"{status_indicator}\n\n{title}\n\n{description}"
        elif "good" in cleaned.lower() or "correct" in cleaned.lower(
        ) or "well done" in cleaned.lower():
            # Positive feedback
            return f"🟢 Looking Good!\n\n{cleaned}"
        elif any(keyword in cleaned.lower()
                 for keyword in ["try", "consider", "think about", "what if"]):
            # Guidance/Suggestion
            return f"💡 Guidance\n\n{cleaned}"
        elif any(keyword in cleaned.lower() for keyword in
                 ["learn", "understand", "concept", "principle"]):
            # Learning opportunity
            return f"📚 Learning Opportunity\n\n{cleaned}"
        else:
            # General response
            return f"💬 {cleaned}"

    def _get_status_indicator(self, response: str, user_input: str) -> str:
        """Determine appropriate status indicator based on response content"""
        response_lower = response.lower()
        input_lower = user_input.lower()

        # Check for code analysis context
        if "analyze" in input_lower or "check" in input_lower or "review" in input_lower:
            if any(word in response_lower
                   for word in ["error", "issue", "problem", "bug", "wrong"]):
                return "🔴 Found Some Issues"
            elif any(word in response_lower for word in
                     ["good", "correct", "fine", "no issues", "looks good"]):
                return "🟢 Code Looks Good"
            else:
                return "🟡 Code Review Complete"

        # Check for learning/help context
        if any(word in response_lower
               for word in ["learn", "understand", "explain"]):
            return "📚 Learning Time"

        # Check for guidance context
        if any(word in response_lower
               for word in ["try", "consider", "suggest"]):
            return "💡 Here's a Thought"

        # Check for encouragement
        if any(word in response_lower
               for word in ["great", "awesome", "excellent", "well done"]):
            return "🎉 Nice Work"

        # Check for debugging help
        if any(word in response_lower for word in ["debug", "fix", "solve"]):
            return "🔧 Let's Debug This"

        # Default
        return "💬 Let's Chat"

    def _clean_response(self, response: str) -> str:
        """Clean AI response to make it more conversational and human-readable"""
        # Remove markdown formatting
        cleaned = response

        # Remove markdown headers
        cleaned = cleaned.replace("###", "").replace("##", "").replace("#", "")

        # Remove bold and italic markdown
        cleaned = cleaned.replace("**", "").replace("*", "")

        # Remove horizontal rules
        cleaned = cleaned.replace("---", "").replace("___", "")

        # Clean up excessive line breaks
        cleaned = cleaned.replace("\n\n\n", "\n\n")

        # Make algorithm explanations more conversational
        if "Algorithm" in cleaned or "Purpose:" in cleaned:
            cleaned = self._make_algorithm_conversational(cleaned)

        # Remove bullet points and numbered lists formatting, make them flow naturally
        import re
        cleaned = re.sub(r'^\s*[-*]\s*', '', cleaned, flags=re.MULTILINE)
        cleaned = re.sub(r'^\s*\d+\.\s*', '', cleaned, flags=re.MULTILINE)

        # Clean up step indicators
        cleaned = cleaned.replace("Step 1:", "First,")
        cleaned = cleaned.replace("Step 2:", "Then,")
        cleaned = cleaned.replace("Step 3:", "Next,")
        cleaned = cleaned.replace("Step 4:", "After that,")
        cleaned = cleaned.replace("Step 5:", "Finally,")

        return cleaned.strip()

    def _make_algorithm_conversational(self, text: str) -> str:
        """Convert formal algorithm descriptions to conversational explanations"""
        conversational = text

        # Replace formal terms with conversational ones
        conversational = conversational.replace("Purpose:", "This is used to")
        conversational = conversational.replace("Requirements:", "You'll need")
        conversational = conversational.replace("Key Steps:",
                                                "Here's how it works:")
        conversational = conversational.replace("Time Complexity:",
                                                "Performance-wise,")
        conversational = conversational.replace("Space Complexity:",
                                                "Memory usage is")

        # Add conversational context for common algorithms
        if "Dijkstra" in conversational and "Prim" in conversational:
            conversational = "I see you're asking about graph algorithms! Let me explain both of these:\n\n" + conversational

        return conversational

    def _rotate_api_key(self) -> bool:
        """Rotate to next available API key"""
        if self.current_key_index < len(self.api_keys) - 1:
            self.current_key_index += 1
            self.api_key = self.api_keys[self.current_key_index]
            print(f"Rotated to API key index: {self.current_key_index}")
            return True
        return False

    def _rotate_model(self) -> bool:
        """Rotate to next available model"""
        if self.current_model_index < len(self.models) - 1:
            self.current_model_index += 1
            self.model = self.models[self.current_model_index]
            print(f"Rotated to model: {self.model}")
            return True
        return False

    def reset_api_key_rotation(self):
        """Reset to the first API key"""
        self.current_key_index = 0
        self.api_key = self.api_keys[0] if self.api_keys else "sk-or-v1-fallback-key"
        print(f"Reset to first API key: {self.api_key[:20]}...")

    def _extract_topic(self, response: str) -> Optional[str]:
        """Extract topic from response for documentation lookup"""
        common_topics = [
            "bubble-sort", "binary-search", "recursion", "arrays",
            "linked-lists", "stacks", "queues", "trees", "graphs", "sorting",
            "searching"
        ]

        response_lower = response.lower()
        for topic in common_topics:
            if topic.replace("-",
                             " ") in response_lower or topic in response_lower:
                return topic
        return None

    def analyze_code(self,
                     code: str,
                     language: str = "python") -> Dict[str, Any]:
        """Analyze user code and provide structured feedback"""
        analysis_prompt = f"""Analyze this {language} code and provide concise, structured feedback.

Code to analyze:
{code}

Provide feedback in this format:
- Start with whether you found any issues or if the code looks good
- If issues exist, briefly state the main problem in simple terms
- Give 1-2 specific suggestions to help the user improve
- Keep explanations simple and actionable
- If you spot common errors, explain them in plain English

Focus on the most important issues first. Don't overwhelm with too many details at once. Remember to be encouraging and supportive."""

        return self.get_response(analysis_prompt)

    def translate_error_message(self, error_message: str) -> str:
        """Translate technical error messages into human-readable explanations"""
        error_lower = error_message.lower()

        # Common Python errors
        if "nameerror" in error_lower:
            if "not defined" in error_lower:
                return "🔴 Unknown Variable\n\nPython doesn't recognize one of your variable names. This usually means you either misspelled it or forgot to create it first.\n\nDouble-check your spelling and make sure you've defined the variable before using it."

        elif "syntaxerror" in error_lower:
            if "invalid syntax" in error_lower:
                return "🔴 Syntax Issue\n\nThere's a typo or missing punctuation that's confusing Python. This is like having a grammar mistake in a sentence.\n\nLook for missing colons, parentheses, or quotes. Check that your indentation is consistent."

        elif "indentationerror" in error_lower:
            return "🔴 Spacing Problem\n\nThe spacing at the start of your lines isn't consistent. Python is picky about indentation because it uses it to understand your code structure.\n\nMake sure lines that should be at the same level have the same amount of spaces or tabs."

        elif "typeerror" in error_lower:
            return "🔴 Type Mismatch\n\nYou're trying to mix different types of data in a way that doesn't work. It's like trying to add a number to a word.\n\nCheck that you're using the right data types together, or convert them to match."

        elif "indexerror" in error_lower:
            return "🔴 List Index Problem\n\nYou're trying to access a position in a list that doesn't exist. It's like asking for the 10th item in a list that only has 5 items.\n\nCheck that your list has enough items, or use len() to see how many items it contains."

        elif "keyerror" in error_lower:
            return "🔴 Dictionary Key Issue\n\nYou're trying to access a key in a dictionary that doesn't exist. It's like looking for a word in a dictionary that isn't there.\n\nCheck your spelling or use the 'in' operator to check if the key exists first."

        elif "attributeerror" in error_lower:
            return "🔴 Method/Attribute Problem\n\nYou're trying to use a method or property that doesn't exist for this type of object.\n\nCheck the documentation for what methods are available, or verify you're using the right object type."

        elif "valueerror" in error_lower:
            return "🔴 Value Problem\n\nYou're passing a value that's the right type but not acceptable for what you're trying to do.\n\nCheck that your values are in the expected range or format."

        elif "importerror" in error_lower or "modulenotfounderror" in error_lower:
            return "🔴 Import Issue\n\nPython can't find a module or library you're trying to use. This usually means it's not installed or the name is misspelled.\n\nCheck the spelling and make sure any required libraries are installed."

        # JavaScript errors
        elif "referenceerror" in error_lower:
            return "🔴 Reference Problem\n\nJavaScript can't find a variable or function you're trying to use. This usually means it's not defined or there's a typo.\n\nCheck spelling and make sure the variable is declared before you use it."

        elif "cannot read property" in error_lower:
            return "🔴 Property Access Issue\n\nYou're trying to access a property on something that's null or undefined. It's like trying to open a door that isn't there.\n\nCheck that your object exists before trying to access its properties."

        # Generic fallback with more helpful language
        else:
            return f"🔴 Error Detected\n\n{error_message}\n\nThis error message might look confusing, but don't worry! Try breaking down what you were trying to do into smaller steps, and I can help you figure out what went wrong."

        # Use AI mentor to translate the error
        mentor = AIMentor()
        translated_message = mentor.translate_error_message(error_message)

        # Also try to provide contextual help
        context_prompt = f"""A user got this error when running their code: {error_message}

Explain what went wrong in simple, friendly terms and give them one specific thing to check or try. Be encouraging and keep it conversational - like you're helping a friend debug their code. Don't use markdown formatting."""

        ai_response = mentor.get_response(context_prompt)