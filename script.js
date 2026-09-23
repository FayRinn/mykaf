// ============================================================
// ============ КОНФИГУРАЦИЯ ==================================
// ============================================================

const API_URL = 'https://script.google.com/macros/s/AKfycbx0N_77aHqiQKpinu70XkEAqM0lHY9BoJ7RfzLaQ-piTkBnGm0EM3Hd0SwfqMQWVD68WQ/exec';

// ============ ПЕРЕМЕННЫЕ ====================================

let allData = {
    teachers: {},
    schedule: [],
    counts: {},
    announcements: []
};

let selectedDate = null;

// ============================================================
// ============ ЗАГРУЗКА ДАННЫХ ===============================
// ============================================================

async function loadData() {
    try {
        const response = await fetch(API_URL + '?action=getData');
        
        const text = await response.text();
        
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('Сервер вернул не JSON:', text.substring(0, 300));
            
            if (text.indexOf('<!DOCTYPE') !== -1 || text.indexOf('<html') !== -1) {
                throw new Error('Сервер временно недоступен. Подождите минуту и обновите страницу.');
            }
            throw new Error('Ошибка сервера. Попробуйте позже.');
        }
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        allData = data;
        
        document.getElementById('loading').style.display = 'none';
        document.getElementById('registrationForm').style.display = 'block';
        
        showAnnouncements(data.announcements);
        populateTeachers();
        
    } catch (err) {
        const loadingEl = document.getElementById('loading');
        loadingEl.innerHTML = 
            '❌ ' + err.message + 
            '<br><br>' +
            '<button onclick="location.reload()" ' +
            'style="padding: 10px 20px; cursor: pointer; background: #1a73e8; ' +
            'color: white; border: none; border-radius: 6px; font-size: 14px;">' +
            'Обновить страницу' +
            '</button>';
        console.error(err);
    }
}

// ============================================================
// ============ ОБЪЯВЛЕНИЯ ====================================
// ============================================================

function showAnnouncements(list) {
    if (!list || list.length === 0) return;
    
    const container = document.getElementById('announcements');
    
    list.forEach(function(text) {
        const div = document.createElement('div');
        div.className = 'announcement';
        div.textContent = '📢 ' + text;
        container.appendChild(div);
    });
}

// ============================================================
// ============ ПРЕПОДАВАТЕЛИ =================================
// ============================================================

function populateTeachers() {
    const select = document.getElementById('teacher');
    const teachers = Object.keys(allData.teachers).sort();
    
    teachers.forEach(function(name) {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    });
}

// Обработка выбора преподавателя
document.getElementById('teacher').addEventListener('change', function() {
    const teacher = this.value;
    const discSelect = document.getElementById('discipline');
    
    discSelect.innerHTML = '';
    hideCalendar();
    
    if (!teacher) {
        discSelect.disabled = true;
        discSelect.innerHTML = '<option value="">— Сначала выберите преподавателя —</option>';
        return;
    }
    
    discSelect.disabled = false;
    
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = '— Выберите дисциплину —';
    discSelect.appendChild(defaultOpt);
    
    const disciplines = Object.keys(allData.teachers[teacher]).sort();
    
    disciplines.forEach(function(disc) {
        const option = document.createElement('option');
        option.value = disc;
        option.textContent = disc;
        discSelect.appendChild(option);
    });
});

// Обработка выбора дисциплины
document.getElementById('discipline').addEventListener('change', function() {
    const teacher = document.getElementById('teacher').value;
    const discipline = this.value;
    
    if (!discipline) {
        hideCalendar();
        return;
    }
    
    const info = allData.teachers[teacher][discipline];
    const infoBlock = document.getElementById('infoBlock');
    const infoText = document.getElementById('infoText');
    
    infoText.innerHTML = 
        '🕐 Дни приёма: <b>' + info.days.join(', ') + '</b><br>' +
        'Время: <b>' + info.time + '</b> | ' +
        'Аудитория: <b>' + info.aud + '</b>';
    
    infoBlock.style.display = 'block';
    
    renderCalendar(teacher, discipline);
});

// ============================================================
// ============ КАЛЕНДАРЬ =====================================
// ============================================================

function hideCalendar() {
    document.getElementById('calendarBlock').style.display = 'none';
    document.getElementById('infoBlock').style.display = 'none';
    document.getElementById('selectedDate').value = '';
    document.getElementById('submitBtn').disabled = true;
    document.getElementById('message').textContent = '';
    document.getElementById('message').className = '';
    selectedDate = null;
}

function renderCalendar(teacher, discipline) {
    const block = document.getElementById('calendarBlock');
    const calendar = document.getElementById('calendar');
    
    block.style.display = 'block';
    
    const schedule = allData.schedule.filter(function(s) {
        return s.teacher === teacher && s.discipline === discipline;
    });
    
    if (schedule.length === 0) {
        calendar.innerHTML = '<p class="hint">Нет доступных дат</p>';
        return;
    }
    
    const months = {};
    
    schedule.forEach(function(s) {
        const parts = s.date.split('.');
        const key = parts[2] + '-' + parts[1];
        if (!months[key]) months[key] = [];
        months[key].push(s);
    });
    
    const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь',
                       'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
    const dayNames = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
    
    let html = '';
    
    const sortedKeys = Object.keys(months).sort();
    
    sortedKeys.forEach(function(monthKey) {
        const parts = monthKey.split('-');
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        
        html += '<div class="month-title">' + monthNames[month] + ' ' + year + '</div>';
        
        dayNames.forEach(function(d) {
            html += '<div class="calendar-header">' + d + '</div>';
        });
        
        const firstDay = new Date(year, month, 1);
        let firstDayIndex = firstDay.getDay();
        firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
        
        for (let i = 0; i < firstDayIndex; i++) {
            html += '<div class="calendar-day empty"></div>';
        }
        
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = ('0' + day).slice(-2) + '.' + 
                           ('0' + (month + 1)).slice(-2) + '.' + year;
            
            const match = schedule.find(function(s) { return s.date === dateStr; });
            
            if (match) {
                const key = dateStr + '|' + teacher + '|' + discipline;
                const count = allData.counts[key] || 0;
                const maxCount = match.maxCount;
                
                if (count >= maxCount) {
                    html += '<div class="calendar-day full" title="Мест нет (' + 
                            count + '/' + maxCount + ')">' + day + '</div>';
                } else {
                    html += '<div class="calendar-day available" ' +
                            'onclick="selectDate(\'' + dateStr + '\', this)" ' +
                            'title="Свободно: ' + (maxCount - count) + ' из ' + maxCount + '">' + 
                            day + '</div>';
                }
            } else {
                const today = new Date();
                today.setHours(0,0,0,0);
                const checkDate = new Date(year, month, day);
                
                if (checkDate < today) {
                    html += '<div class="calendar-day past">' + day + '</div>';
                } else {
                    html += '<div class="calendar-day empty">' + day + '</div>';
                }
            }
        }
    });
    
    calendar.innerHTML = html;
}

// Выбор даты
function selectDate(dateStr, element) {
    document.querySelectorAll('.calendar-day.selected').forEach(function(el) {
        el.classList.remove('selected');
    });
    
    element.classList.add('selected');
    
    selectedDate = dateStr;
    document.getElementById('selectedDate').value = dateStr;
    document.getElementById('submitBtn').disabled = false;
    
    const teacher = document.getElementById('teacher').value;
    const discipline = document.getElementById('discipline').value;
    const key = dateStr + '|' + teacher + '|' + discipline;
    const count = allData.counts[key] || 0;
    
    const match = allData.schedule.find(function(s) {
        return s.date === dateStr && s.teacher === teacher && s.discipline === discipline;
    });
    const maxCount = match ? match.maxCount : 10;
    
    showMessage('📅 Выбрано: ' + dateStr + ' (' + count + '/' + maxCount + ')', 'info');
}

// ============================================================
// ============ ОТПРАВКА ФОРМЫ ================================
// ============================================================

document.getElementById('registrationForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const fio = document.getElementById('fio').value.trim();
    const group = document.getElementById('group').value.trim();
    const topic = document.getElementById('topic').value.trim();
    const teacher = document.getElementById('teacher').value;
    const discipline = document.getElementById('discipline').value;
    const date = document.getElementById('selectedDate').value;
    
    // Проверки
    if (!fio || !group || !topic) {
        showMessage('❌ Заполните все поля', 'error');
        return;
    }
    
    if (!teacher || !discipline) {
        showMessage('❌ Выберите преподавателя и дисциплину', 'error');
        return;
    }
    
    if (!date) {
        showMessage('❌ Выберите дату', 'error');
        return;
    }
    
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.textContent = 'Отправка...';
    
    showMessage('⏳ Отправляем запись... Не закрывайте страницу', 'info');
    
    const key = date + '|' + teacher + '|' + discipline;
    const prevCount = allData.counts[key] || 0;
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'register',
                fio: fio,
                group: group,
                topic: topic,
                teacher: teacher,
                discipline: discipline,
                date: date
            })
        });
        
        const text = await response.text();
        
        let result;
        try {
            result = JSON.parse(text);
        } catch (e) {
            throw new Error('JSON_PARSE_ERROR');
        }
        
        if (result.success) {
            allData.counts[key] = (allData.counts[key] || 0) + 1;
            showMessage('✅ ' + result.message, 'success');
            btn.textContent = 'Готово ✓';
            renderCalendar(teacher, discipline);
        } else if (result.duplicate) {
            showMessage('✅ Вы уже записаны на эту дату', 'success');
            btn.textContent = 'Готово ✓';
        } else {
            showMessage('❌ ' + result.error, 'error');
            btn.disabled = false;
            btn.textContent = 'Записаться';
        }
        
    } catch (err) {
        console.error('Ошибка при отправке:', err);
        
        showMessage(
            '⏳ Запись отправлена. Проверяем статус через 10 секунд...', 
            'info'
        );
        
        btn.textContent = 'Проверка...';
        btn.disabled = true;
        
        setTimeout(async function() {
            try {
                const checkResponse = await fetch(API_URL + '?action=getData');
                const checkText = await checkResponse.text();
                const checkData = JSON.parse(checkText);
                
                allData = checkData;
                
                const newCount = allData.counts[key] || 0;
                const maxCount = allData.schedule.find(
                    s => s.date === date && s.teacher === teacher && s.discipline === discipline
                )?.maxCount || 10;
                
                if (newCount > prevCount) {
                    showMessage(
                        '✅ Запись сохранена! Записано: ' + newCount + '/' + maxCount,
                        'success'
                    );
                    btn.textContent = 'Готово ✓';
                    btn.disabled = true;
                    renderCalendar(teacher, discipline);
                } else {
                    showMessage(
                        '⏳ Не удалось проверить автоматически. ' +
                        'Нажмите «Обновить», чтобы проверить статус.',
                        'info'
                    );
                    btn.textContent = 'Обновить';
                    btn.disabled = false;
                    btn.onclick = function() { location.reload(); };
                }
                
            } catch (checkErr) {
                showMessage(
                    '⏳ Запись отправлена. ' +
                    'Нажмите «Обновить», чтобы проверить статус.',
                    'info'
                );
                btn.textContent = 'Обновить';
                btn.disabled = false;
                btn.onclick = function() { location.reload(); };
            }
        }, 10000);
    }
});

// ============================================================
// ============ СООБЩЕНИЯ =====================================
// ============================================================

function showMessage(text, type) {
    const msg = document.getElementById('message');
    msg.textContent = text;
    msg.className = type || '';
}

// ============================================================
// ============ ЗАПУСК ========================================
// ============================================================

document.addEventListener('DOMContentLoaded', loadData);
