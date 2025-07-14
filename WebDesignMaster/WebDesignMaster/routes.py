from flask import render_template, request, jsonify, session, redirect, url_for
from app import app, db
from models import Session as UserSession, Interaction
from ai_mentor import AIMentor
import json
import uuid
import os
import re


def simple_markdown_to_html(markdown_text):
    """Simple markdown to HTML converter for basic formatting"""
    html = markdown_text
    
    # Headers
    html = re.sub(r'^### (.*$)', r'<h3>\1</h3>', html, flags=re.MULTILINE)
    html = re.sub(r'^## (.*$)', r'<h2>\1</h2>', html, flags=re.MULTILINE)
    html = re.sub(r'^# (.*$)', r'<h1>\1</h1>', html, flags=re.MULTILINE)
    
    # Bold and italic
    html = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', html)
    html = re.sub(r'\*(.*?)\*', r'<em>\1</em>', html)
    
    # Code blocks
    html = re.sub(r'```(.*?)```', r'<pre><code>\1</code></pre>', html, flags=re.DOTALL)
    html = re.sub(r'`(.*?)`', r'<code>\1</code>', html)
    
    # Links
    html = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', html)
    
    # Lists
    lines = html.split('\n')
    in_list = False
    result_lines = []
    
    for line in lines:
        if re.match(r'^\s*[-*+]\s', line):
            if not in_list:
                result_lines.append('<ul>')
                in_list = True
            item_text = re.sub(r'^\s*[-*+]\s', '', line)
            result_lines.append(f'<li>{item_text}</li>')
        elif re.match(r'^\s*\d+\.\s', line):
            if not in_list:
                result_lines.append('<ol>')
                in_list = True
            item_text = re.sub(r'^\s*\d+\.\s', '', line)
            result_lines.append(f'<li>{item_text}</li>')
        else:
            if in_list:
                if in_list and result_lines[-1].startswith('<ul>'):
                    result_lines.append('</ul>')
                elif in_list and result_lines[-1].startswith('<ol>'):
                    result_lines.append('</ol>')
                in_list = False
            
            if line.strip():
                result_lines.append(f'<p>{line}</p>')
            else:
                result_lines.append('<br>')
    
    if in_list:
        result_lines.append('</ul>')
    
    # Line breaks
    html = '\n'.join(result_lines)
    html = re.sub(r'\n\n+', '\n', html)
    
    return html


mentor = AIMentor()

@app.route('/')
def index():
    """Main application page"""
    # Generate or get session ID
    if 'session_id' not in session:
        session['session_id'] = str(uuid.uuid4())

    return render_template('index.html')

@app.route('/api/chat', methods=['POST'])
def chat():
    """Handle chat interactions with AI mentor"""
    try:
        data = request.get_json()
        user_input = data.get('message', '')
        interaction_type = data.get('type', 'code')  # 'learn' or 'code'

        if not user_input:
            return jsonify({'error': 'No message provided'}), 400

        session_id = session.get('session_id')

        # Get conversation history from database
        recent_interactions = Interaction.query.filter_by(
            session_id=session_id
        ).order_by(Interaction.created_at.desc()).limit(10).all()

        conversation_history = []
        for interaction in reversed(recent_interactions):
            conversation_history.append({"role": "user", "content": interaction.user_input})
            conversation_history.append({"role": "assistant", "content": interaction.mentor_response})

        # Get AI response
        response_data = mentor.get_response(user_input, conversation_history)

        if response_data['success']:
            # Save interaction to database
            interaction = Interaction(
                session_id=session_id,
                user_input=user_input,
                mentor_response=response_data['response'],
                interaction_type=interaction_type
            )
            db.session.add(interaction)
            db.session.commit()

            return jsonify({
                'response': response_data['response'],
                'is_learning_mode': response_data.get('is_learning_mode', False),
                'suggested_topic': response_data.get('suggested_topic')
            })
        else:
            return jsonify({'error': response_data['response']}), 500

    except Exception as e:
        app.logger.error(f"Chat error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/analyze-code', methods=['POST'])
def analyze_code():
    """Analyze user code and provide feedback"""
    try:
        data = request.get_json()
        code = data.get('code', '')
        language = data.get('language', 'python')

        if not code:
            return jsonify({'error': 'No code provided'}), 400

        # Detect algorithms and extract visualization data
        visualization_data = detect_algorithm_for_visualization(code)

        # Get AI analysis
        analysis_data = mentor.analyze_code(code, language)

        if analysis_data['success']:
            response = {
                'analysis': analysis_data['response'],
                'suggestions': []
            }

            # Add visualization data if algorithm detected
            if visualization_data:
                response['visualization'] = visualization_data

            return jsonify(response)
        else:
            return jsonify({'error': analysis_data['response']}), 500

    except Exception as e:
        app.logger.error(f"Code analysis error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

def detect_algorithm_for_visualization(code):
    """Detect algorithms in code and return visualization data"""
    import re

    code_lower = code.lower()

    # Extract arrays from code
    def extract_arrays_from_code(code):
        arrays = []
        # Look for list literals like [1, 2, 3, 4]
        list_patterns = re.findall(r'\[[\d\s,]+\]', code)
        for pattern in list_patterns:
            try:
                # Clean and evaluate the list
                clean_pattern = pattern.strip()
                array = eval(clean_pattern)
                if isinstance(array, list) and all(isinstance(x, (int, float)) for x in array):
                    arrays.append(array)
            except:
                continue

        # Look for array assignments like arr = [...]
        assignment_patterns = re.findall(r'(?:arr|array|data|numbers|list)\s*=\s*\[[\d\s,]+\]', code, re.IGNORECASE)
        for pattern in assignment_patterns:
            try:
                # Extract just the list part
                list_part = re.search(r'\[[\d\s,]+\]', pattern)
                if list_part:
                    array = eval(list_part.group())
                    if isinstance(array, list) and all(isinstance(x, (int, float)) for x in array):
                        arrays.append(array)
            except:
                continue

        return arrays

    # Extract target values for searching
    def extract_target_from_code(code):
        # Look for target assignments (various patterns)
        target_patterns = [
            r'target\s*=\s*(\d+)',  # target = 5
            r'search_for\s*=\s*(\d+)',  # search_for = 5
            r'find\s*=\s*(\d+)',  # find = 5
            r'key\s*=\s*(\d+)',  # key = 5
            r'value\s*=\s*(\d+)',  # value = 5
            r'x\s*=\s*(\d+)',  # x = 5
            r'num\s*=\s*(\d+)',  # num = 5
            r'element\s*=\s*(\d+)',  # element = 5
        ]

        for pattern in target_patterns:
            matches = re.findall(pattern, code, re.IGNORECASE)
            if matches:
                try:
                    return int(matches[0])
                except:
                    continue

        # Look for search function calls with target
        search_function_patterns = [
            r'search\([^,]+,\s*(\d+)\)',  # search(arr, 5)
            r'binary_search\([^,]+,\s*(\d+)\)',  # binary_search(arr, 5)
            r'find\([^,]+,\s*(\d+)\)',  # find(arr, 5)
            r'locate\([^,]+,\s*(\d+)\)',  # locate(arr, 5)
        ]

        for pattern in search_function_patterns:
            matches = re.findall(pattern, code, re.IGNORECASE)
            if matches:
                try:
                    return int(matches[0])
                except:
                    continue

        # Look for print statements mentioning target
        print_patterns = re.findall(r'print\([^)]*(\d+)[^)]*\)', code)
        if print_patterns:
            try:
                return int(print_patterns[-1])  # Use the last number found in print statements
            except:
                pass

        # Look for if conditions with comparisons
        condition_patterns = [
            r'if\s+.*?==\s*(\d+)',  # if arr[mid] == 5
            r'if\s+.*?!=\s*(\d+)',  # if arr[mid] != 5
            r'if\s+.*?<\s*(\d+)',   # if arr[mid] < 5
            r'if\s+.*?>\s*(\d+)',   # if arr[mid] > 5
        ]

        for pattern in condition_patterns:
            matches = re.findall(pattern, code, re.IGNORECASE)
            if matches:
                try:
                    return int(matches[0])
                except:
                    continue

        # Look for any standalone numbers that might be targets (last resort)
        numbers = re.findall(r'\b(\d+)\b', code)
        if numbers:
            # Filter out common non-target numbers
            filtered_numbers = [int(n) for n in numbers if int(n) not in [0, 1, 2, 10, 100, 1000]]
            if filtered_numbers:
                return filtered_numbers[0]  # Return first reasonable number

        return None

    arrays = extract_arrays_from_code(code)
    default_array = arrays[0] if arrays else [64, 34, 25, 12, 22, 11, 90]

    # Generate proper bubble sort steps
    def generate_bubble_sort_steps(array):
        steps = []
        arr = array.copy()
        n = len(arr)

        for i in range(n):
            swapped = False
            for j in range(0, n - i - 1):
                # Compare step
                steps.append({'type': 'compare', 'indices': [j, j + 1], 'array': arr.copy()})

                # Swap if needed
                if arr[j] > arr[j + 1]:
                    arr[j], arr[j + 1] = arr[j + 1], arr[j]
                    steps.append({'type': 'swap', 'indices': [j, j + 1], 'array': arr.copy()})
                    swapped = True

            if not swapped:
                break

        steps.append({'type': 'complete', 'array': arr.copy()})
        return steps

    # Generate proper selection sort steps
    def generate_selection_sort_steps(array):
        steps = []
        arr = array.copy()
        n = len(arr)

        for i in range(n):
            min_idx = i
            steps.append({'type': 'select', 'index': i, 'array': arr.copy()})

            for j in range(i + 1, n):
                steps.append({'type': 'compare', 'indices': [min_idx, j], 'array': arr.copy()})
                if arr[j] < arr[min_idx]:
                    min_idx = j
                    steps.append({'type': 'new_min', 'index': min_idx, 'array': arr.copy()})

            if min_idx != i:
                arr[i], arr[min_idx] = arr[min_idx], arr[i]
                steps.append({'type': 'swap', 'indices': [i, min_idx], 'array': arr.copy()})

        steps.append({'type': 'complete', 'array': arr.copy()})
        return steps

    def generate_quick_sort_steps(arr):
        """Generate steps for quick sort visualization"""
        steps = []
        arr_copy = arr.copy()

        def partition(low, high):
            if low >= high:
                return high
                
            pivot_index = high
            pivot_value = arr_copy[high]
            
            steps.append({
                'type': 'select_pivot',
                'pivot_index': pivot_index,
                'left': low,
                'right': high,
                'array': arr_copy.copy()
            })

            i = low - 1

            for j in range(low, high):
                steps.append({
                    'type': 'partition_compare',
                    'comparing_index': j,
                    'pivot_index': pivot_index,
                    'array': arr_copy.copy()
                })

                if arr_copy[j] <= pivot_value:
                    i += 1
                    if i != j:
                        arr_copy[i], arr_copy[j] = arr_copy[j], arr_copy[i]
                        steps.append({
                            'type': 'swap',
                            'indices': [i, j],
                            'array': arr_copy.copy()
                        })
                    steps.append({
                        'type': 'partition_move',
                        'element_index': i,
                        'pivot_index': pivot_index,
                        'array': arr_copy.copy()
                    })
                else:
                    steps.append({
                        'type': 'partition_greater',
                        'element_index': j,
                        'pivot_index': pivot_index,
                        'array': arr_copy.copy()
                    })

            # Place pivot in its final position
            i += 1
            if i != high:
                arr_copy[i], arr_copy[high] = arr_copy[high], arr_copy[i]
                steps.append({
                    'type': 'swap',
                    'indices': [i, high],
                    'array': arr_copy.copy()
                })
            
            steps.append({
                'type': 'place_pivot',
                'final_position': i,
                'array': arr_copy.copy()
            })

            return i

        def quick_sort(low, high):
            if low < high:
                pi = partition(low, high)
                quick_sort(low, pi - 1)
                quick_sort(pi + 1, high)

        quick_sort(0, len(arr_copy) - 1)

        steps.append({
            'type': 'complete',
            'array': arr_copy.copy()
        })

        return steps

    def generate_merge_sort_steps(arr):
        """Generate steps for merge sort visualization"""
        steps = []
        arr_copy = arr.copy()

        def merge(left, mid, right):
            if left >= right:
                return
                
            left_arr = arr_copy[left:mid+1]
            right_arr = arr_copy[mid+1:right+1]

            # Show division
            left_indices = list(range(left, mid + 1))
            right_indices = list(range(mid + 1, right + 1))
            
            steps.append({
                'type': 'divide',
                'left_half': left_indices,
                'right_half': right_indices,
                'array': arr_copy.copy()
            })

            i = j = 0
            k = left
            temp_array = []

            while i < len(left_arr) and j < len(right_arr):
                steps.append({
                    'type': 'merge_compare',
                    'left_index': left + i,
                    'right_index': mid + 1 + j,
                    'array': arr_copy.copy()
                })

                if left_arr[i] <= right_arr[j]:
                    temp_array.append(left_arr[i])
                    steps.append({
                        'type': 'merge_place',
                        'target_index': k,
                        'source_value': left_arr[i],
                        'merge_range': [left, right],
                        'array': arr_copy.copy()
                    })
                    i += 1
                else:
                    temp_array.append(right_arr[j])
                    steps.append({
                        'type': 'merge_place',
                        'target_index': k,
                        'source_value': right_arr[j],
                        'merge_range': [left, right],
                        'array': arr_copy.copy()
                    })
                    j += 1
                k += 1

            while i < len(left_arr):
                temp_array.append(left_arr[i])
                steps.append({
                    'type': 'merge_place',
                    'target_index': k,
                    'source_value': left_arr[i],
                    'merge_range': [left, right],
                    'array': arr_copy.copy()
                })
                i += 1
                k += 1

            while j < len(right_arr):
                temp_array.append(right_arr[j])
                steps.append({
                    'type': 'merge_place',
                    'target_index': k,
                    'source_value': right_arr[j],
                    'merge_range': [left, right],
                    'array': arr_copy.copy()
                })
                j += 1
                k += 1

            # Copy merged array back to original
            for i in range(len(temp_array)):
                arr_copy[left + i] = temp_array[i]

            steps.append({
                'type': 'merge_complete',
                'merged_range': [left, right],
                'array': arr_copy.copy()
            })

        def merge_sort(left, right):
            if left < right:
                mid = (left + right) // 2
                merge_sort(left, mid)
                merge_sort(mid + 1, right)
                merge(left, mid, right)

        merge_sort(0, len(arr_copy) - 1)

        steps.append({
            'type': 'complete',
            'array': arr_copy.copy()
        })

        return steps

    # Generate proper linear search steps
    def generate_linear_search_steps(array, target):
        steps = []

        for i in range(len(array)):
            steps.append({'type': 'compare', 'index': i, 'value': array[i], 'target': target})
            if array[i] == target:
                steps.append({'type': 'found', 'index': i, 'value': array[i]})
                return steps

        steps.append({'type': 'not_found', 'target': target})
        return steps

    # Generate proper binary search steps
    def generate_binary_search_steps(array, target):
        steps = []
        arr = sorted(array)  # Binary search requires sorted array
        left, right = 0, len(arr) - 1

        while left <= right:
            mid = (left + right) // 2
            steps.append({'type': 'compare', 'index': mid, 'value': arr[mid], 'target': target, 'left': left, 'right': right})

            if arr[mid] == target:
                steps.append({'type': 'found', 'index': mid, 'value': arr[mid]})
                return steps
            elif arr[mid] < target:
                left = mid + 1
                steps.append({'type': 'eliminate_left', 'new_left': left, 'right': right})
            else:
                right = mid - 1
                steps.append({'type': 'eliminate_right', 'left': left, 'new_right': right})

        steps.append({'type': 'not_found', 'target': target})
        return steps

    # Detect bubble sort - require actual sorting logic, not just keywords
    if ('bubble' in code_lower and ('for' in code_lower or 'while' in code_lower)):
        # Must have actual comparison and swap logic
        has_comparison = any(pattern in code for pattern in ['arr[j] > arr[j+1]', 'arr[i] > arr[i+1]', '[j] >', '[i] >'])
        has_swap = any(pattern in code_lower for pattern in ['swap', 'temp =', '= temp', 'arr[j], arr[j+1] ='])

        if has_comparison and (has_swap or ', ' in code):  # Check for tuple swap or temp variable
            return {
                'type': 'sorting',
                'data': {
                    'array': default_array,
                    'steps': generate_bubble_sort_steps(default_array)
                }
            }

    # Detect selection sort - require actual sorting logic
    if ('selection' in code_lower and ('for' in code_lower or 'while' in code_lower)):
        # Must have minimum finding logic and swapping
        has_min_logic = any(pattern in code_lower for pattern in ['min_idx', 'minimum', 'min_index', 'smallest'])
        has_nested_loops = code_lower.count('for') >= 2 or ('for' in code_lower and 'while' in code_lower)

        if has_min_logic and has_nested_loops:
            return {
                'type': 'sorting',
                'data': {
                    'array': default_array,
                    'steps': generate_selection_sort_steps(default_array)
                }
            }

    # Detect binary search - improved detection logic
    # Check for binary search keywords and patterns
    has_binary_keyword = 'binary' in code_lower
    has_search_keyword = 'search' in code_lower
    has_mid_variable = any(pattern in code_lower for pattern in ['mid', 'middle', 'm =', 'm='])
    has_left_right = ('left' in code_lower and 'right' in code_lower) or ('low' in code_lower and 'high' in code_lower) or ('start' in code_lower and 'end' in code_lower)
    has_while_loop = 'while' in code_lower
    has_array_access = any(pattern in code for pattern in ['[', 'arr', 'array', 'list', 'nums'])
    has_comparison = any(pattern in code for pattern in ['==', '!=', '<', '>', '<=', '>='])

    # More flexible mid calculation detection
    has_mid_calc = any(pattern in code_lower for pattern in [
        'mid = ', 'mid=', 'middle =', 'middle=', 'm =', 'm=',
        '+ right', '+right', '+ high', '+high', '+ end', '+end',
        '/ 2', '/2', '// 2', '//2'
    ])

    # More flexible range update detection
    has_range_update = any(pattern in code_lower for pattern in [
        'left =', 'left=', 'right =', 'right=',
        'low =', 'low=', 'high =', 'high=',
        'start =', 'start=', 'end =', 'end=',
        'mid + 1', 'mid+1', 'mid - 1', 'mid-1'
    ])

    # Binary search detection with more flexible criteria
    binary_search_score = 0
    if has_binary_keyword: binary_search_score += 3
    if has_search_keyword: binary_search_score += 1
    if has_mid_variable: binary_search_score += 2
    if has_left_right: binary_search_score += 2
    if has_while_loop: binary_search_score += 1
    if has_array_access: binary_search_score += 1
    if has_comparison: binary_search_score += 1
    if has_mid_calc: binary_search_score += 2
    if has_range_update: binary_search_score += 2

    # If score is high enough, consider it binary search
    if binary_search_score >= 5:
        target = extract_target_from_code(code)
        search_array = sorted(default_array) if default_array else [1, 3, 5, 7, 9, 11, 13, 15, 17, 19]
        if target is None:
            target = search_array[len(search_array)//2] if search_array else 7
        return {
            'type': 'searching',
            'data': {
                'array': search_array,
                'target': target,
                'steps': generate_binary_search_steps(search_array, target)
            }
        }

    # Detect linear search - improved detection logic
    has_linear_keyword = 'linear' in code_lower
    has_search_keyword = 'search' in code_lower
    has_for_loop = 'for' in code_lower
    has_while_loop = 'while' in code_lower
    has_array_access = any(pattern in code for pattern in ['[', 'arr', 'array', 'list', 'nums'])
    has_target_search = any(pattern in code_lower for pattern in ['target', 'key', 'value', 'find', 'search'])
    has_comparison = any(pattern in code for pattern in ['==', '!='])
    has_return_logic = any(pattern in code_lower for pattern in ['return', 'found', 'print', 'break'])

    # Linear search detection with flexible criteria
    linear_search_score = 0
    if has_linear_keyword: linear_search_score += 3
    if has_search_keyword and (has_for_loop or has_while_loop): linear_search_score += 2
    if has_for_loop: linear_search_score += 1
    if has_while_loop: linear_search_score += 1
    if has_array_access: linear_search_score += 1
    if has_target_search: linear_search_score += 1
    if has_comparison: linear_search_score += 1
    if has_return_logic: linear_search_score += 1

    # If score is high enough and it's not already detected as binary search, consider it linear search
    if linear_search_score >= 4 and binary_search_score < 5:
        target = extract_target_from_code(code)
        if target is None:
            target = default_array[len(default_array)//2] if default_array else 23
        return {
            'type': 'searching',
            'data': {
                'array': default_array,
                'target': target,
                'steps': generate_linear_search_steps(default_array, target)
            }
        }

    # Detect merge sort FIRST - improved detection
    merge_sort_keywords = ['merge', 'mergesort', 'merge_sort']
    has_merge_keyword = any(keyword in code_lower for keyword in merge_sort_keywords)
    has_divide_conquer = any(pattern in code_lower for pattern in ['divide', 'conquer', 'split'])
    has_merge_logic = 'merge(' in code_lower or 'mergesort(' in code_lower
    has_recursive_calls = code_lower.count('mergesort(') >= 2 or code_lower.count('merge_sort(') >= 2
    has_merge_function = 'def merge(' in code_lower
    has_mid_calculation = 'mid' in code_lower and '//' in code_lower
    
    # Score-based detection for merge sort
    merge_sort_score = 0
    if has_merge_keyword: merge_sort_score += 3
    if has_merge_function: merge_sort_score += 3
    if has_recursive_calls: merge_sort_score += 2
    if has_mid_calculation: merge_sort_score += 1
    if has_divide_conquer: merge_sort_score += 1
    
    if merge_sort_score >= 4:
        return {
            'type': 'sorting',
            'data': {
                'array': default_array,
                'steps': generate_merge_sort_steps(default_array)
            }
        }

    # Detect quick sort - improved detection
    quick_sort_keywords = ['quick', 'quicksort', 'quick_sort']
    has_quick_keyword = any(keyword in code_lower for keyword in quick_sort_keywords)
    has_partition = 'partition' in code_lower
    has_pivot = 'pivot' in code_lower
    has_recursion = any(pattern in code_lower for pattern in ['quicksort(', 'quick_sort(', 'recursion'])
    
    if has_quick_keyword or (has_partition and has_pivot):
        return {
            'type': 'sorting',
            'data': {
                'array': default_array,
                'steps': generate_quick_sort_steps(default_array)
            }
        }

    # Detect insertion sort specifically
    if ('insertion' in code_lower and 'for' in code_lower):
        has_key_variable = any(pattern in code_lower for pattern in ['key =', 'key=', 'current =', 'current='])
        has_while_shift = 'while' in code_lower and any(pattern in code for pattern in ['arr[j]', 'array[j]', 'list[j]'])
        if has_key_variable and has_while_shift:
            return {
                'type': 'sorting',
                'data': {
                    'array': default_array,
                    'steps': generate_bubble_sort_steps(default_array)  # Use bubble sort steps as fallback
                }
            }

    return None

@app.route('/docs/<topic>')
def docs(topic):
    """Serve documentation pages"""
    try:
        from flask import send_from_directory
        import os

        # Map topic to HTML file
        topic_files = {
            'bubble-sort': 'bubble-sort.html',
            'binary-search': 'binary-search.html',
            'quick-sort': 'quick-sort.html',
            'merge-sort': 'merge-sort.html',
            'recursion': 'recursion.html',
            'library': 'library.html'
        }

        if topic in topic_files:
            docs_dir = os.path.join(app.root_path, 'docs')
            return send_from_directory(docs_dir, topic_files[topic])
        else:
            return "Documentation not found", 404

    except Exception as e:
        app.logger.error(f"Documentation error: {str(e)}")
        return "Documentation not found", 404

@app.route('/api/run-code', methods=['POST'])
def run_code():
    """Execute user code in a safe environment"""
    try:
        data = request.get_json()
        code = data.get('code', '')
        language = data.get('language', 'python')
        interactive = data.get('interactive', False)
        inputs = data.get('inputs', [])

        if not code:
            return jsonify({'success': False, 'error': 'No code provided'}), 400

        if language.lower() != 'python':
            return jsonify({'success': False, 'error': 'Only Python is currently supported'}), 400

        # Basic validation for potentially problematic patterns
        dangerous_patterns = [
            'while True:',
            'while 1:',
            'for i in range(999999',
            'for i in range(1000000'
        ]

        for pattern in dangerous_patterns:
            if pattern in code:
                return jsonify({
                    'success': False,
                    'error': f'Potentially infinite loop detected: "{pattern}". Please review your code.'
                }), 400

        # Import necessary modules for safe execution
        import subprocess
        import tempfile
        import os

        try:
            # Handle interactive code by replacing input() calls with pre-collected inputs
            if interactive and inputs:
                input_index = 0
                modified_code = code

                # Replace input() calls with the pre-collected values
                import re
                def replace_input(match):
                    nonlocal input_index
                    if input_index < len(inputs):
                        value = inputs[input_index]
                        input_index += 1
                        # Return the input as a string literal
                        return f'"{value}"'
                    return 'input()'

                # Replace all input() calls
                modified_code = re.sub(r'input\([^)]*\)', replace_input, modified_code)
                code_to_execute = modified_code
            else:
                code_to_execute = code

            # Create a temporary file for the code
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as temp_file:
                temp_file.write(code_to_execute)
                temp_file_path = temp_file.name

            # Execute the code with a timeout
            result = subprocess.run(
                ['python', temp_file_path],
                capture_output=True,
                text=True,
                timeout=30,  # 30 second timeout
                cwd=os.path.dirname(temp_file_path)
            )

            # Clean up the temporary file
            os.unlink(temp_file_path)

            if result.returncode == 0:
                output = result.stdout.strip() if result.stdout.strip() else "Code executed successfully (no output)"
                return jsonify({
                    'success': True,
                    'output': output
                })
            else:
                error_output = result.stderr.strip() if result.stderr.strip() else "Unknown execution error"
                return jsonify({
                    'success': False,
                    'error': error_output
                })

        except subprocess.TimeoutExpired:
            # Clean up the temporary file if it exists
            try:
                os.unlink(temp_file_path)
            except:
                pass
            return jsonify({
                'success': False,
                'error': 'Code execution timed out (30 seconds limit). Check for infinite loops or long-running operations.'
            })
        except Exception as e:
            # Clean up the temporary file if it exists
            try:
                os.unlink(temp_file_path)
            except:
                pass
            return jsonify({
                'success': False,
                'error': f'Execution error: {str(e)}'
            })

    except Exception as e:
        app.logger.error(f"Code execution error: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

@app.route('/api/preview-html', methods=['POST'])
def preview_html():
    """Preview HTML content in a new window"""
    try:
        data = request.get_json()
        html_content = data.get('content', '')
        filename = data.get('filename', 'preview.html')
        
        if not html_content:
            return jsonify({'success': False, 'error': 'No HTML content provided'}), 400
        
        # Store the HTML content in session for preview
        preview_id = str(uuid.uuid4())
        session[f'html_preview_{preview_id}'] = {
            'content': html_content,
            'filename': filename,
            'type': 'html'
        }
        
        # Return the preview URL
        preview_url = f"/preview/{preview_id}"
        return jsonify({
            'success': True,
            'preview_url': preview_url
        })
        
    except Exception as e:
        app.logger.error(f"HTML preview error: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

@app.route('/api/preview-markdown', methods=['POST'])
def preview_markdown():
    """Preview Markdown content in a new window"""
    try:
        data = request.get_json()
        markdown_content = data.get('content', '')
        filename = data.get('filename', 'preview.md')
        
        if not markdown_content:
            return jsonify({'success': False, 'error': 'No Markdown content provided'}), 400
        
        # Store the Markdown content in session for preview
        preview_id = str(uuid.uuid4())
        session[f'markdown_preview_{preview_id}'] = {
            'content': markdown_content,
            'filename': filename,
            'type': 'markdown'
        }
        
        # Return the preview URL
        preview_url = f"/preview/{preview_id}"
        return jsonify({
            'success': True,
            'preview_url': preview_url
        })
        
    except Exception as e:
        app.logger.error(f"Markdown preview error: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

@app.route('/preview/<preview_id>')
def serve_html_preview(preview_id):
    """Serve HTML or Markdown preview content"""
    try:
        # Try HTML preview first
        preview_data = session.get(f'html_preview_{preview_id}')
        if not preview_data:
            # Try markdown preview
            preview_data = session.get(f'markdown_preview_{preview_id}')
            if not preview_data:
                return """
                <html>
                <head><title>Preview Not Found</title></head>
                <body style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
                    <h2>Preview Not Found</h2>
                    <p>This preview has expired or doesn't exist.</p>
                    <p>Please run your file again to generate a new preview.</p>
                    <button onclick="window.close()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">Close Window</button>
                </body>
                </html>
                """, 404
        
        content = preview_data['content']
        content_type = preview_data.get('type', 'html')
        
        if content_type == 'markdown':
            # Convert markdown to HTML
            try:
                import markdown
                html_content = markdown.markdown(content, extensions=['codehilite', 'fenced_code', 'tables', 'toc'])
            except ImportError:
                # Fallback: simple markdown to HTML conversion
                html_content = simple_markdown_to_html(content)
            
            # Wrap in HTML template
            html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{preview_data['filename']}</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #fff;
            color: #333;
        }}
        h1, h2, h3, h4, h5, h6 {{
            color: #2c3e50;
            margin-top: 1.5em;
            margin-bottom: 0.5em;
        }}
        h1 {{ border-bottom: 2px solid #eee; padding-bottom: 10px; }}
        h2 {{ border-bottom: 1px solid #eee; padding-bottom: 5px; }}
        code {{
            background: #f8f9fa;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Monaco', 'Consolas', monospace;
            color: #e83e8c;
        }}
        pre {{
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 5px;
            padding: 15px;
            overflow-x: auto;
        }}
        pre code {{
            background: none;
            padding: 0;
            color: inherit;
        }}
        blockquote {{
            border-left: 4px solid #007bff;
            margin: 0;
            padding-left: 20px;
            color: #6c757d;
        }}
        table {{
            border-collapse: collapse;
            width: 100%;
            margin: 1em 0;
        }}
        th, td {{
            border: 1px solid #dee2e6;
            padding: 8px 12px;
            text-align: left;
        }}
        th {{
            background: #f8f9fa;
            font-weight: 600;
        }}
        img {{
            max-width: 100%;
            height: auto;
        }}
        a {{
            color: #007bff;
            text-decoration: none;
        }}
        a:hover {{
            text-decoration: underline;
        }}
        ul, ol {{
            padding-left: 20px;
        }}
        li {{
            margin: 0.25em 0;
        }}
    </style>
</head>
<body>
{html_content}
</body>
</html>"""
        else:
            # HTML content
            html_content = content
            
            # Basic HTML template if the content doesn't include full HTML structure
            if not html_content.strip().lower().startswith('<!doctype') and not html_content.strip().lower().startswith('<html'):
                html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{preview_data['filename']}</title>
</head>
<body>
{html_content}
</body>
</html>"""
        
        from flask import Response
        return Response(html_content, mimetype='text/html')
        
    except Exception as e:
        app.logger.error(f"Preview serve error: {str(e)}")
        return "Error serving preview", 500

@app.route('/api/analyze-grammar', methods=['POST'])
def analyze_grammar():
    """Analyze grammar and writing quality of text content"""
    try:
        data = request.get_json()
        content = data.get('content', '')
        filename = data.get('filename', 'text.txt')

        if not content:
            return jsonify({'success': False, 'error': 'No content provided'}), 400

        # Create grammar analysis prompt
        grammar_prompt = f"""Please analyze the following text for grammar, spelling, sentence structure, and writing quality. Provide detailed feedback and suggestions for improvement.

Text to analyze:
{content}

Please provide:
1. Overall assessment of the writing quality
2. Specific grammar issues and corrections
3. Spelling errors and corrections
4. Sentence structure improvements
5. Clarity and readability suggestions
6. Style and tone recommendations

Format your response in a clear, helpful manner that guides the user to improve their writing."""

        # Get AI analysis
        analysis_data = mentor.get_response(grammar_prompt)

        if analysis_data['success']:
            # Parse suggestions for problems panel
            suggestions = parse_grammar_suggestions(content, analysis_data['response'])
            
            response = {
                'success': True,
                'analysis': analysis_data['response'],
                'suggestions': suggestions,
                'suggestions_count': len(suggestions)
            }

            return jsonify(response)
        else:
            return jsonify({'success': False, 'error': analysis_data['response']}), 500

    except Exception as e:
        app.logger.error(f"Grammar analysis error: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

def parse_grammar_suggestions(content, analysis_response):
    """Parse AI response to extract specific suggestions for problems panel"""
    suggestions = []
    
    # Look for common grammar issues in the AI response
    lines = content.split('\n')
    response_lower = analysis_response.lower()
    
    # Add some basic suggestions based on common patterns
    if 'grammar' in response_lower and 'error' in response_lower:
        suggestions.append({
            'type': 'warning',
            'message': 'Grammar issues detected - check AI analysis for details'
        })
    
    if 'spelling' in response_lower and ('error' in response_lower or 'mistake' in response_lower):
        suggestions.append({
            'type': 'error',
            'message': 'Spelling errors found - see AI suggestions for corrections'
        })
    
    if 'sentence' in response_lower and ('structure' in response_lower or 'clarity' in response_lower):
        suggestions.append({
            'type': 'info',
            'message': 'Sentence structure improvements suggested'
        })
    
    if 'readability' in response_lower or 'clarity' in response_lower:
        suggestions.append({
            'type': 'info',
            'message': 'Readability and clarity improvements available'
        })
    
    return suggestions

@app.route('/api/session-status')
def session_status():
    """Get current session status"""
    session_id = session.get('session_id')
    if not session_id:
        return jsonify({'session_id': None, 'interactions': 0})

    interaction_count = Interaction.query.filter_by(session_id=session_id).count()

    return jsonify({
        'session_id': session_id,
        'interactions': interaction_count
    })