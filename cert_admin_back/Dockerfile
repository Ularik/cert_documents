FROM python:3.13.5-slim-bullseye

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
EXPOSE 8000
RUN apt update -y

RUN mkdir -p /usr/www/logs
RUN mkdir -p /usr/www/media

RUN python -m pip install --upgrade pip
#RUN pip install pipenv

WORKDIR /home

COPY requirements.txt .
#COPY Pipfile .
RUN pip install -r requirements.txt

#RUN pipenv install

WORKDIR /home
COPY . .

# CMD ["python", "-m", "daphne", "-b", "0.0.0.0", "-p", "8000", "project.asgi:application"]